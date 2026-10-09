import { App, PostMessageTransport, applyDocumentTheme, type McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import { mountCreatorPipeline } from './creator-pipeline/index.ts';
import { createCreatorPipelineController, creatorJobStructuredOutput, type CreatorPipelineLimits } from './creator-pipeline-controller.ts';

const WAIT_MS = 10_000;

/** Read-only persisted job view. No provider calls, storage or start/generate capability. */
export function mountCreatorPipelineBridge(root: HTMLElement, limits: CreatorPipelineLimits = {}) {
  const timeoutMs = limits.timeoutMs ?? WAIT_MS;
  const app = new App({ name: 'kettle-creator-pipeline', version: '1.0.0' },
    { availableDisplayModes: ['inline'] }, { autoResize: false });
  const doc = root.ownerDocument;
  const host = doc.createElement('section');
  host.setAttribute('aria-label', 'Kettle creator job');
  host.style.cssText = 'font-family:system-ui,sans-serif;color:inherit;line-height:1.5';
  const message = doc.createElement('p');
  message.setAttribute('role', 'status'); message.setAttribute('aria-live', 'polite');
  message.tabIndex = -1;
  const card = doc.createElement('div');
  const refresh = doc.createElement('button');
  refresh.type = 'button'; refresh.textContent = 'Refresh job'; refresh.hidden = true;
  refresh.style.cssText = 'font:inherit;padding:8px 12px;margin:8px;border:1px solid currentColor;border-radius:8px;color:inherit;background:transparent;cursor:pointer';
  host.append(message, card, refresh); root.replaceChildren(host);
  let view: ReturnType<typeof mountCreatorPipeline> | undefined;
  function clearCard(text: string) {
    const hadFocus = host.contains(doc.activeElement);
    view?.dispose(); view = undefined; card.replaceChildren();
    refresh.hidden = true; message.textContent = text;
    if (hadFocus) message.focus({ preventScroll: true });
  }
  const messages = {
    reauthorize: 'Reconnect your Kettle account through ChatGPT, then reopen this job.',
    unavailable: 'This creator job is unavailable. Ask Kettle in chat to reopen it.',
    invalid: 'Kettle returned invalid or mismatched job details. Reopen this job in chat.',
    connection: 'The connection could not load this creator job. Reopen it in chat or reconnect Kettle.',
  } as const;
  const controller = createCreatorPipelineController({
    loading() { clearCard('Loading your saved creator job…'); },
    job(job, status) {
      view ??= mountCreatorPipeline(card); view.render(job);
      message.textContent = status.notice ?? (status.refreshing ? 'Checking saved job status…' : '');
      refresh.hidden = !status.canRefresh; refresh.disabled = status.refreshing;
    },
    cleared(reason) { clearCard(messages[reason]); },
  }, async (input, signal) => creatorJobStructuredOutput(await app.callServerTool(
    { name: 'get_creator_job', arguments: input },
    { signal, timeout: timeoutMs + 1_000, maxTotalTimeout: timeoutMs + 1_000 })), limits);
  refresh.addEventListener('click', () => { void controller.refresh(); });
  // Receiving a job before initialization must not cancel the handshake deadline.
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
    view?.dispose(); view = undefined; host.remove();
    clearTimeout(initialTimer);
    window.removeEventListener('pagehide', dispose);
    app.ontoolinput = undefined;
    app.ontoolresult = undefined;
    app.ontoolcancelled = undefined;
    app.onhostcontextchanged = undefined;
    void app.close();
  }
  app.ontoolinput = (params) => controller.receiveInput(params.arguments);
  app.ontoolresult = (params) => controller.receiveResult(creatorJobStructuredOutput(params));
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
      clearTimeout(initialTimer);
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
  if (root) mountCreatorPipelineBridge(root);
}
