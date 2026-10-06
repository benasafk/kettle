import { App, PostMessageTransport, applyDocumentTheme, type McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import { GetProjectInput, GetProjectOutput, type Project } from '../../packages/contracts/index.ts';
import { mountProjectReview, type ProjectReviewState } from './project-review.ts';

const WAIT_MS = 10_000;
const REOPEN = 'Ask Kettle to reopen this project brief in chat.';
const PREVIOUS = 'Previously loaded snapshot. Refresh failed; try Refresh brief again.';
type ReadProject = (projectId: string, signal: AbortSignal) => Promise<unknown>;

/** Presentation state only. Authentication and ownership remain on the server. */
export function createProjectReviewController(
  render: (state: ProjectReviewState) => void,
  readProject: ReadProject,
  timeoutMs = WAIT_MS,
) {
  let disposed = false;
  let connected = false;
  let canRefresh = false;
  let terminal = false;
  let project: Project | undefined;
  let projectId: string | undefined;
  let version = 0;
  let generation = 0;
  let pending: AbortController | undefined;
  let initialTimer: ReturnType<typeof setTimeout> | undefined;

  function invalidate() {
    generation++;
    pending?.abort();
    pending = undefined;
  }
  function clearInitialTimer() {
    clearTimeout(initialTimer);
    initialTimer = undefined;
  }
  function error(message: string, recovery: 'reopen' | 'reauthorize' | 'contact_support' | 'reload' = 'reopen') {
    invalidate();
    clearInitialTimer();
    project = undefined;
    render({ kind: 'error', message, recovery });
  }
  function loading() {
    clearInitialTimer();
    render({ kind: 'loading' });
    initialTimer = setTimeout(() => {
      terminal = true;
      error(`The project brief did not load in time. ${REOPEN}`);
    }, timeoutMs);
  }
  function ready(warning?: string) {
    if (!project || !connected) return;
    clearInitialTimer();
    render({ kind: 'ready', project, refreshing: !!pending, ...(warning ? { warning } : {}) });
  }
  function applyResult(raw: unknown, refreshing: boolean) {
    const envelope = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const parsed = GetProjectOutput.safeParse(envelope.structuredContent);
    if (!parsed.success || (envelope.isError === true && parsed.data.ok)) {
      error(`Kettle returned an unreadable project brief. ${REOPEN}`);
      return;
    }
    const result = parsed.data;
    if (!result.ok) {
      switch (result.error.code) {
        case 'UNAUTHENTICATED':
          error('Reconnect your Kettle account through ChatGPT, then reopen this brief.', 'reauthorize'); return;
        case 'FORBIDDEN':
          error('Access to this project is denied.', 'contact_support'); return;
        case 'NOT_FOUND':
          error('This project is unavailable.', 'reload'); return;
        case 'UNAVAILABLE':
          if (refreshing && project) { ready(PREVIOUS); return; }
          break;
      }
      error(`Kettle could not load this project brief. ${REOPEN}`);
      return;
    }
    const next = result.data.project;
    if (projectId && next.id !== projectId) {
      error(`The returned brief does not match this project. ${REOPEN}`);
      return;
    }
    if (next.current_version < version) {
      if (project) ready('Previously loaded snapshot. An older response was ignored; refresh again or reopen in chat.');
      else error(`An older project brief was returned. ${REOPEN}`);
      return;
    }
    projectId = next.id;
    version = next.current_version;
    project = next;
    ready();
  }

  async function refresh() {
    if (disposed || terminal || !connected || !canRefresh || !project || pending) return;
    const expectedId = project.id;
    const current = ++generation;
    const abort = new AbortController();
    pending = abort;
    ready();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // The deadline also protects callers whose transport never settles. The
      // abort reaches SDK request cleanup; late completions cannot change state.
      const result = await Promise.race([
        readProject(expectedId, abort.signal),
        new Promise<never>((_resolve, reject) => {
          abort.signal.addEventListener('abort', () => reject(new Error('Cancelled')), { once: true });
          timer = setTimeout(() => { abort.abort(); reject(new Error('Timeout')); }, timeoutMs);
        }),
      ]);
      if (disposed || current !== generation) return;
      pending = undefined;
      applyResult(result, true);
    } catch {
      if (disposed || current !== generation) return;
      pending = undefined;
      ready(PREVIOUS);
    } finally {
      clearTimeout(timer);
    }
  }

  loading();
  return {
    refresh,
    connected(supportsTools: boolean) {
      if (disposed || terminal) return;
      connected = true;
      canRefresh = supportsTools;
      if (!supportsTools) {
        terminal = true;
        error(`This host cannot refresh project briefs. ${REOPEN}`);
      } else ready();
    },
    receiveInput(raw: unknown) {
      if (disposed || terminal) return;
      const parsed = GetProjectInput.safeParse(raw);
      if (!parsed.success) { error(`The project selection is invalid. ${REOPEN}`); return; }
      invalidate();
      if (parsed.data.project_id !== projectId) {
        projectId = parsed.data.project_id;
        version = 0;
        project = undefined;
        loading();
      } else ready();
    },
    receiveResult(raw: unknown) {
      if (disposed || terminal) return;
      invalidate();
      applyResult(raw, false);
    },
    connectionFailed() {
      if (disposed) return;
      terminal = true;
      error(`The ChatGPT connection is unavailable. ${REOPEN}`);
    },
    dispose() {
      disposed = true;
      invalidate();
      clearInitialTimer();
      project = undefined;
      projectId = undefined;
    },
  };
}

/** No credentials, direct HTTP requests, persistence, polling or chat writes. */
export function mountProjectReviewBridge(root: HTMLElement) {
  const app = new App({ name: 'kettle-project-review', version: '1.0.0' },
    { availableDisplayModes: ['inline'] }, { autoResize: true });
  const view = mountProjectReview(root, { onRefresh: () => { void controller.refresh(); } });
  const controller = createProjectReviewController((state) => view.render(state),
    (projectId, signal) => app.callServerTool({ name: 'get_project', arguments: { project_id: projectId } },
      { signal, timeout: WAIT_MS, maxTotalTimeout: WAIT_MS }));
  const applyContext = (context: McpUiHostContext | undefined) => {
    if (context?.theme) applyDocumentTheme(context.theme);
    if (context?.locale) document.documentElement.lang = context.locale;
    // No host font CSS is injected: this card uses system fonts and no assets.
  };
  let disposed = false;
  const handshake = new AbortController();
  function dispose() {
    if (disposed) return;
    disposed = true;
    handshake.abort();
    controller.dispose();
    view.dispose();
    window.removeEventListener('pagehide', dispose);
    app.ontoolinput = undefined;
    app.ontoolresult = undefined;
    app.ontoolcancelled = undefined;
    app.onhostcontextchanged = undefined;
    void app.close();
  }
  app.ontoolinput = (params) => controller.receiveInput(params.arguments);
  app.ontoolresult = (params) => controller.receiveResult(params);
  app.ontoolcancelled = () => controller.connectionFailed();
  app.onhostcontextchanged = applyContext;
  app.onclose = () => { if (!disposed) controller.connectionFailed(); };
  // Acknowledge teardown before closing the transport, so the host receives its response.
  app.onteardown = async () => { setTimeout(dispose, 0); return {}; };
  window.addEventListener('pagehide', dispose, { once: true });
  if (window.parent === window) {
    controller.connectionFailed();
  } else {
    void app.connect(new PostMessageTransport(window.parent, window.parent),
      { signal: handshake.signal, timeout: WAIT_MS, maxTotalTimeout: WAIT_MS }).then(() => {
      if (disposed) return;
      applyContext(app.getHostContext());
      controller.connected(!!app.getHostCapabilities()?.serverTools);
    }).catch(() => { if (!disposed) controller.connectionFailed(); });
  }
  return { dispose };
}

// Bundling this module is the browser entry. Imports in Node tests have no side effects.
if (typeof document !== 'undefined') {
  const root = document.getElementById('root');
  if (root) mountProjectReviewBridge(root);
}
