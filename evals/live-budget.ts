/** Local evaluation accounting only. Never delete/reset this ledger to regain budget. */
import { closeSync, fsyncSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { z } from 'zod';

export const TOTAL_CAP_USD = 25;
const Reservation = z.strictObject({
  type: z.literal('reservation'), id: z.string().min(1), provider: z.enum(['openai', 'lightreel', 'scrapecreators', 'ensembledata']),
  upper_bound_usd: z.number().positive().max(TOTAL_CAP_USD), recorded_at: z.iso.datetime(),
});
type Reservation = z.infer<typeof Reservation>;

export function readReservations(path: string): Reservation[] {
  // The committed empty ledger must exist. Missing/truncated/corrupt history fails closed.
  const text = readFileSync(path, 'utf8');
  if (text && !text.endsWith('\n')) throw new Error('Incomplete budget ledger; reconcile before continuing.');
  const rows = text.trim() ? text.trim().split('\n').map(line => Reservation.parse(JSON.parse(line))) : [];
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Duplicate reservation.');
  if (totalReserved(rows) > TOTAL_CAP_USD) throw new Error('Ledger exceeds authorized cap.');
  return rows;
}
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
    const reserved = totalReserved(readReservations(this.path));
    return { cap_usd: TOTAL_CAP_USD, reserved_usd: reserved, remaining_unreserved_usd: TOTAL_CAP_USD - reserved };
  }
  reserve(value: Omit<Reservation, 'type' | 'recorded_at'>) {
    if (this.closed) throw new Error('Ledger is closed.');
    const row = Reservation.parse({ ...value, type: 'reservation', recorded_at: new Date().toISOString() });
    const existing = readReservations(this.path);
    if (existing.some(item => item.id === row.id)) throw new Error('Duplicate reservation.');
    if (totalReserved([...existing, row]) > TOTAL_CAP_USD) throw new Error('Aggregate provider budget exhausted.');
    const fd = openSync(this.path, 'a', 0o600);
    try { writeFileSync(fd, JSON.stringify(row) + '\n'); fsyncSync(fd); } finally { closeSync(fd); }
    // Never refund failures, timeouts or unused reservations automatically.
  }
  close() {
    if (!this.closed) { closeSync(this.lock); unlinkSync(`${this.path}.lock`); this.closed = true; }
  }
}
