import type { z } from 'zod';
import { GetCreatorDnaInput, GetCreatorDnaOutput, type CreatorDnaView } from '../../packages/contracts/creator-operations.ts';

type Selection = z.infer<typeof GetCreatorDnaInput>;
/** Lifecycle callbacks, not UI props. The adapter maps these to Shanghai's exports. */
export interface CreatorReviewObserver {
  loading(): void;
  saved(dna: CreatorDnaView, read: { refreshing: boolean; refreshAvailable: boolean; warning?: string }): void;
  unavailable(reason: 'reauthorize' | 'unavailable' | 'invalid' | 'connection'): void;
}
type ReadDna = (input: Selection, signal: AbortSignal) => Promise<unknown>;

/** Complete text fallback over the public allowlist only; internal envelopes fail closed. */
export function creatorDnaText(raw: unknown): string {
  return JSON.stringify(GetCreatorDnaOutput.parse(raw));
}

/** No transport, credentials, UI implementation, storage, polling or write capability. */
export function createCreatorReviewController(observer: CreatorReviewObserver, readDna: ReadDna, timeoutMs = 10_000) {
  let selection: Selection | undefined;
  let dna: CreatorDnaView | undefined;
  let highWater = 0;
  let epoch = 0;
  let connected = false;
  let tools = false;
  let disposed = false;
  let blocked = false;
  let pending: AbortController | undefined;
  let initialTimer: ReturnType<typeof setTimeout> | undefined;
  const clearTimer = () => { clearTimeout(initialTimer); initialTimer = undefined; };
  function invalidate() { epoch++; pending?.abort(); pending = undefined; }
  function clear(reason: Parameters<CreatorReviewObserver['unavailable']>[0]) {
    invalidate(); clearTimer(); dna = undefined; blocked = true; observer.unavailable(reason);
  }
  function publish(warning?: string) {
    if (!dna || !connected) return;
    clearTimer();
    observer.saved(dna, { refreshing: !!pending, refreshAvailable: tools && !blocked,
      ...(warning ? { warning } : {}) });
  }
  function apply(raw: unknown, refresh: boolean) {
    const parsed = GetCreatorDnaOutput.safeParse(raw);
    if (!parsed.success) { clear('invalid'); return; }
    const result = parsed.data;
    if (!result.ok) {
      if (result.error.code === 'UNAVAILABLE' && refresh && dna) {
        publish('Refresh failed. Try Refresh again or reopen this review.'); return;
      }
      clear(result.error.code === 'UNAUTHENTICATED' ? 'reauthorize' : 'unavailable'); return;
    }
    const next = result.data.dna;
    if (!selection || next.dna_id !== selection.dna_id ||
        (selection.version !== undefined && next.version !== selection.version)) { clear('invalid'); return; }
    // A stable association belongs to one project/profile/scan. Corrections change
    // snapshot_id, not these parent identities. Never compare versions across IDs.
    if (dna && (next.project_id !== dna.project_id || next.source_scan_id !== dna.source_scan_id ||
        next.profile.platform !== dna.profile.platform || next.profile.native_id !== dna.profile.native_id ||
        (next.version === dna.version && next.snapshot_id !== dna.snapshot_id))) { clear('invalid'); return; }
    if (next.version < highWater) { publish('An older response was ignored. Refresh to check the saved version.'); return; }
    highWater = next.version;
    dna = next;
    publish();
  }
  async function refresh() {
    if (disposed || blocked || !connected || !tools || !dna || !selection || pending) return;
    const input = { ...selection };
    const requestEpoch = ++epoch;
    const abort = new AbortController(); pending = abort; publish();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    try {
      const result = await Promise.race([
        readDna(input, abort.signal),
        new Promise<never>((_resolve, reject) => {
          abort.signal.addEventListener('abort', () => reject(new Error('Cancelled')), { once: true });
          timer = setTimeout(() => { timedOut = true; abort.abort(); }, timeoutMs);
        }),
      ]);
      if (disposed || requestEpoch !== epoch) return;
      pending = undefined; apply(result, true);
    } catch {
      if (disposed || requestEpoch !== epoch) return;
      pending = undefined;
      if (timedOut) publish('Refresh timed out. Try Refresh again or reopen this review.');
      else clear('connection'); // Unknown host rejection can be an auth failure.
    } finally { clearTimeout(timer); }
  }
  return {
    refresh,
    connected(supportsReads: boolean) {
      if (disposed || blocked) return;
      connected = true; tools = supportsReads; publish();
    },
    receiveInput(raw: unknown) {
      if (disposed || blocked) return;
      const parsed = GetCreatorDnaInput.safeParse(raw);
      if (!parsed.success) { clear('invalid'); return; }
      invalidate(); clearTimer();
      const next = parsed.data;
      if (!selection || selection.dna_id !== next.dna_id || selection.version !== next.version) {
        dna = undefined; highWater = 0;
      }
      selection = next;
      if (dna && connected) publish();
      else {
        observer.loading();
        initialTimer = setTimeout(() => clear('connection'), timeoutMs);
      }
    },
    /** Receives the operation output, not an arbitrary model snapshot or MCP text. */
    receiveResult(raw: unknown) {
      if (disposed || blocked) return;
      invalidate(); apply(raw, false);
    },
    connectionFailed() { if (!disposed) clear('connection'); },
    dispose() { if (disposed) return; disposed = true; invalidate(); clearTimer(); dna = undefined; selection = undefined; },
  };
}
