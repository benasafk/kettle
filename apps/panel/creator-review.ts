import { mountCreatorReview } from './creator-loop/index.ts';
import { createCreatorReviewController } from './creator-review-controller.ts';

const messages = {
  reauthorize: 'Reconnect your Kettle account through ChatGPT, then reopen this review.',
  unavailable: 'This creator review is unavailable.',
  invalid: 'Kettle returned an invalid or mismatched creator review.',
  connection: 'The connection could not load this creator review. Reconnect Kettle if needed.',
} as const;

/**
 * Read-only component adapter. The future host bridge supplies authenticated reads
 * and operation outputs. No auto-mount, transport, tool registration or mutations.
 * Explicit refresh is exposed to the caller; the current UI has no action callbacks.
 */
export function mountSavedCreatorReview(
  root: HTMLElement,
  readDna: Parameters<typeof createCreatorReviewController>[1],
  timeoutMs = 10_000,
) {
  const view = mountCreatorReview(root);
  const controller = createCreatorReviewController({
    loading: () => view.render({ kind: 'loading' }),
    saved(dna, read) {
      // The current component cannot display stale-data warnings. Use its existing
      // recovery state instead of silently showing stale content or inventing UI.
      if (read.warning) view.render({ kind: 'error', message: read.warning });
      else view.render({ kind: 'saved', dna, preview: false });
    },
    unavailable: reason => view.render({ kind: 'error', message: messages[reason] }),
  }, readDna, timeoutMs);
  return {
    connected: controller.connected,
    receiveInput: controller.receiveInput,
    receiveResult: controller.receiveResult,
    refresh: controller.refresh,
    connectionFailed: controller.connectionFailed,
    dispose() { controller.dispose(); view.dispose(); },
  };
}
