/** Local evaluation accounting only. Never delete/reset this ledger to regain budget. */
import { closeSync, fsyncSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { z } from 'zod';

export const TOTAL_CAP_USD = 25;
const Reservation = z.strictObject({
  type: z.literal('reservation'), id: z.string().min(1), provider: z.enum(['openai', 'lightreel', 'scrapecreators', 'ensembledata']),
  upper_bound_usd: z.number().positive().max(TOTAL_CAP_USD), recorded_at: z.iso.datetime(),
});
type Reservation = z.infer<typeof Reservation>;
const BilledCost = z.strictObject({
  type: z.literal('billed_cost'), reservation_id: z.string().min(1),
  actual_usd: z.number().nonnegative().max(Number.MAX_SAFE_INTEGER / 1e6), receipt_reference: z.string().trim().min(1).max(500),
  recorded_at: z.iso.datetime(),
});
type BilledCost = z.infer<typeof BilledCost>;
const Event = z.discriminatedUnion('type', [Reservation, BilledCost]);

function readLedger(path: string) {
  // The committed empty ledger must exist. Missing/truncated/corrupt history fails closed.
  const text = readFileSync(path, 'utf8');
  if (text && !text.endsWith('\n')) throw new Error('Incomplete budget ledger; reconcile before continuing.');
  const events = text.trim() ? text.trim().split('\n').map(line => Event.parse(JSON.parse(line))) : [];
  const rows = events.filter((event): event is Reservation => event.type === 'reservation');
  const costs = events.filter((event): event is BilledCost => event.type === 'billed_cost');
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Duplicate reservation.');
  if (totalReserved(rows) > TOTAL_CAP_USD) throw new Error('Ledger exceeds authorized cap.');
  const reservedIds = new Set<string>();
  const billedIds = new Set<string>();
  for (const event of events) {
    if (event.type === 'reservation') reservedIds.add(event.id);
    else {
      if (!reservedIds.has(event.reservation_id)) throw new Error('Cost has no preceding reservation.');
      if (billedIds.has(event.reservation_id)) throw new Error('Duplicate billed cost.');
      billedIds.add(event.reservation_id);
    }
  }
  return { rows, costs };
}
export function readReservations(path: string): Reservation[] { return readLedger(path).rows; }
const micros = (usd: number) => Math.ceil(usd * 1e6);
function totalReserved(rows: Reservation[]) { return rows.reduce((total, row) => total + micros(row.upper_bound_usd), 0) / 1e6; }

export class LiveBudgetLedger {
  private closed = false;
  private readonly lock: number;
  constructor(private readonly path: string) {
    this.lock = openSync(`${path}.lock`, 'wx', 0o600);
    try { readReservations(path); } catch (error) { this.close(); throw error; }
  }
  snapshot() {
    const { rows, costs } = readLedger(this.path);
    const reserved = totalReserved(rows);
    const knownBilled = costs.reduce((sum, cost) => sum + cost.actual_usd, 0);
    const charged = new Map(costs.map(cost => [cost.reservation_id, cost.actual_usd]));
    const exposure = rows.reduce((sum, row) => sum + Math.max(micros(row.upper_bound_usd), micros(charged.get(row.id) ?? 0)), 0) / 1e6;
    return {
      cap_usd: TOTAL_CAP_USD, reserved_usd: reserved,
      // Retain reservations even after reconciliation: no automatic budget recycling.
      remaining_unreserved_usd: Math.max(0, TOTAL_CAP_USD - exposure),
      known_billed_usd: knownBilled,
      billed_cost_usd: costs.length === rows.length ? knownBilled : null,
      unreconciled_reservations: rows.length - costs.length,
      reservation_bound_breached: rows.some(row => (charged.get(row.id) ?? 0) > row.upper_bound_usd),
    };
  }
  reserve(value: Omit<Reservation, 'type' | 'recorded_at'>) {
    if (this.closed) throw new Error('Ledger is closed.');
    const row = Reservation.parse({ ...value, type: 'reservation', recorded_at: new Date().toISOString() });
    if (this.snapshot().reservation_bound_breached) throw new Error('Billed cost exceeded a reservation; reconcile bounds with Bangkok before more spending.');
    const existing = readReservations(this.path);
    if (existing.some(item => item.id === row.id)) throw new Error('Duplicate reservation.');
    if (totalReserved([...existing, row]) > TOTAL_CAP_USD) throw new Error('Aggregate provider budget exhausted.');
    this.append(row);
    // Never refund failures, timeouts or unused reservations automatically.
  }
  /** Operator reconciliation from an actual provider receipt; never pass a token-price estimate. */
  recordBilledCost(value: Omit<BilledCost, 'type' | 'recorded_at'>) {
    if (this.closed) throw new Error('Ledger is closed.');
    const cost = BilledCost.parse({ ...value, type: 'billed_cost', recorded_at: new Date().toISOString() });
    const { rows, costs } = readLedger(this.path);
    if (!rows.some(row => row.id === cost.reservation_id)) throw new Error('Unknown reservation.');
    if (costs.some(row => row.reservation_id === cost.reservation_id)) throw new Error('Duplicate billed cost.');
    this.append(cost);
  }
  private append(event: z.infer<typeof Event>) {
    const fd = openSync(this.path, 'a', 0o600);
    try { writeFileSync(fd, JSON.stringify(event) + '\n'); fsyncSync(fd); } finally { closeSync(fd); }
  }
  close() {
    if (!this.closed) { closeSync(this.lock); unlinkSync(`${this.path}.lock`); this.closed = true; }
  }
}
