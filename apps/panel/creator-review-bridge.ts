import { App, PostMessageTransport, applyDocumentTheme, type McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import { GetCreatorDnaOutput } from '../../packages/contracts/creator-operations.ts';
import { mountSavedCreatorReview } from './creator-review.ts';

const WAIT_MS = 10_000;

/** Accept only the filtered public output; never parse model text or private _meta. */
export function creatorReviewOutput(raw: unknown): unknown {
  const envelope = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const parsed = GetCreatorDnaOutput.safeParse(envelope.structuredContent);
  if (!parsed.success || (envelope.isError === true && parsed.data.ok)) return undefined;
  return parsed.data;
}

/** No credentials, direct HTTP requests, persistence, polling or chat writes. */
export function mountCreatorReviewBridge(root: HTMLElement, timeoutMs = WAIT_MS) {
  const app = new App({ name: 'kettle-creator-review', version: '1.0.0' },
    { availableDisplayModes: ['inline'] }, { autoResize: false });
  const controller = mountSavedCreatorReview(root, async (input, signal) =>
    creatorReviewOutput(await app.callServerTool({ name: 'get_creator_dna', arguments: input },
      { signal, timeout: timeoutMs + 1_000, maxTotalTimeout: timeoutMs + 1_000 })), timeoutMs);
  // Bound the wait even if the host never sends a selection after initialization.
  const initialTimer = setTimeout(() => controller.connectionFailed(), timeoutMs);
  const applyContext = (context: McpUiHostContext | undefined) => {
    if (context?.theme) applyDocumentTheme(context.theme);
    if (context?.locale) document.documentElement.lang = context.locale;
    // No host font CSS is injected: this card uses system fonts and no assets.
  };
  let disposed = false;
  let bridgeReady = false;
  let resizeObserver: ResizeObserver | undefined;
  let resizeFrame: number | undefined;
  let lastSize = '';
  function stopResize() {
    resizeObserver?.disconnect();
    if (resizeFrame !== undefined) cancelAnimationFrame(resizeFrame);
    resizeFrame = undefined;
  }
  function scheduleSize() {
    if (disposed || !bridgeReady || resizeFrame !== undefined) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = undefined;
      if (disposed || !bridgeReady) return;
      const element = document.documentElement;
      const previousHeight = element.style.height;
      element.style.height = 'max-content';
      const height = Math.ceil(element.getBoundingClientRect().height);
      element.style.height = previousHeight;
      const width = Math.ceil(window.innerWidth);
      const size = `${width}:${height}`;
      if (size === lastSize) return;
      lastSize = size;
      // ext-apps 1.7.5's autoResize does not retain its cleanup callback or
      // cancel queued animation frames on close. Own this lifecycle explicitly.
      void app.sendSizeChanged({ width, height }).catch(() => {});
    });
  }
  const handshake = new AbortController();
  function dispose() {
    if (disposed) return;
    disposed = true;
    handshake.abort();
    stopResize();
    controller.dispose();
    clearTimeout(initialTimer);
    window.removeEventListener('pagehide', dispose);
    app.ontoolinput = undefined;
    app.ontoolresult = undefined;
    app.ontoolcancelled = undefined;
    app.onhostcontextchanged = undefined;
    void app.close();
  }
  app.ontoolinput = (params) => { clearTimeout(initialTimer); controller.receiveInput(params.arguments); };
  app.ontoolresult = (params) => controller.receiveResult(creatorReviewOutput(params));
  app.ontoolcancelled = () => controller.connectionFailed();
  app.onhostcontextchanged = applyContext;
  app.onclose = () => { bridgeReady = false; stopResize(); if (!disposed) controller.connectionFailed(); };
  // Acknowledge teardown before closing the transport, so the host receives its response.
  app.onteardown = async () => { setTimeout(dispose, 0); return {}; };
  window.addEventListener('pagehide', dispose, { once: true });
  if (window.parent === window) {
    controller.connectionFailed();
  } else {
    void app.connect(new PostMessageTransport(window.parent, window.parent),
      { signal: handshake.signal, timeout: timeoutMs, maxTotalTimeout: timeoutMs }).then(() => {
      if (disposed) return;
      bridgeReady = true;
      resizeObserver = new ResizeObserver(scheduleSize);
      resizeObserver.observe(document.documentElement);
      resizeObserver.observe(document.body);
      scheduleSize();
      applyContext(app.getHostContext());
      controller.connected(!!app.getHostCapabilities()?.serverTools);
    }).catch(() => { if (!disposed) controller.connectionFailed(); });
  }
  return { dispose, refresh: controller.refresh };
}

// Bundling this module is the browser entry. Imports in Node tests have no side effects.
if (typeof document !== 'undefined') {
  const root = document.getElementById('root');
  if (root) mountCreatorReviewBridge(root);
}
