import { riffLockup } from '../riff-ui/brand.ts';
import { riffBaseStyles } from '../riff-ui/styles.ts';
import type { RiffPanelAction } from '../riff-ui/dom.ts';

export type RiffHomeState =
  | { status: 'loading' }
  | { status: 'ready'; account: { id: string; name: string } }
  | { status: 'error'; message: string };

export function riffHomeStructuredOutput(value: unknown): RiffHomeState {
  if (!value || typeof value !== 'object') return { status: 'error', message: 'Riff could not read this account. Reopen it from ChatGPT.' };
  const result = value as { ok?: unknown; data?: unknown; error?: unknown };
  if (result.ok !== true || !result.data || typeof result.data !== 'object') {
    const code = result.error && typeof result.error === 'object' ? (result.error as { code?: unknown }).code : undefined;
    return { status: 'error', message: code === 'UNAUTHENTICATED' || code === 'FORBIDDEN'
      ? 'Reconnect your Riff account in ChatGPT, then reopen Home.'
      : 'Riff could not read this account. Reopen it from ChatGPT.' };
  }
  const account = (result.data as { account?: unknown }).account;
  if (!account || typeof account !== 'object') return { status: 'error', message: 'Riff returned incomplete account details. Reopen Home.' };
  const { id, display_name: name } = account as { id?: unknown; display_name?: unknown };
  if (typeof id !== 'string' || typeof name !== 'string' || !name.trim()) {
    return { status: 'error', message: 'Riff returned incomplete account details. Reopen Home.' };
  }
  return { status: 'ready', account: { id, name: name.trim() } };
}

const homeStyles = `
${riffBaseStyles}
html, body { margin: 0; min-height: 100%; background: var(--riff-canvas, #F4F5F7); }
body { min-height: 100vh; }
.riff-home { min-height: 100vh; padding: calc(28px + var(--riff-safe-top, 0px)) calc(28px + var(--riff-safe-right, 0px)) calc(40px + var(--riff-safe-bottom, 0px)) calc(28px + var(--riff-safe-left, 0px)); background: var(--riff-surface); }
.riff-home__shell { width: min(100%, 1055px); margin: 0 auto; }
.riff-home__header { display: flex; flex-direction: column; align-items: center; gap: 7px; }
.riff-home__brand { width: 104px; height: 38px; color: var(--riff-ink); }
.riff-home__account { max-width: min(100%, 520px); color: var(--riff-muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.riff-home__hero { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 14px 0 24px; text-align: center; }
.riff-home h1 { max-width: 820px; font-size: clamp(34px, 5vw, 44px); line-height: 1.12; letter-spacing: -.035em; text-wrap: balance; }
.riff-home__intro { max-width: 680px; color: var(--riff-muted); font-size: 14px; }
.riff-home__composer { width: min(100%, 760px); margin: 0 auto; padding: 14px; border-radius: 20px; background: #EFF4FF; box-shadow: 0 12px 24px rgba(32,53,86,.08); }
.riff-home__shortcuts { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-bottom: 12px; }
.riff-home__input-shell { overflow: hidden; border: 1px solid #DDE5F4; border-radius: 14px; background: var(--riff-surface); }
.riff-home__composer textarea { display: block; width: 100%; min-height: 72px; resize: vertical; padding: 18px; border: 0; outline: 0; color: var(--riff-ink); background: transparent; }
.riff-home__composer textarea::placeholder { color: var(--riff-muted); opacity: 1; }
.riff-home__composer-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 18px 14px; }
.riff-home__upload, .riff-home__send, .riff-home__action, .riff-home__library { border: 1px solid var(--riff-line); color: var(--riff-ink); background: var(--riff-surface); cursor: pointer; }
.riff-home__upload { min-height: 40px; padding: 8px 0; border: 0; color: var(--riff-muted); }
.riff-home__send { min-height: 40px; padding: 8px 22px; border: 0; border-radius: var(--riff-radius-control); color: #fff; background: var(--riff-primary); font-size: 14px; font-weight: 650; box-shadow: 0 6px 12px rgba(56,101,248,.25); }
.riff-home__status { width: min(100%, 760px); min-height: 24px; margin: 10px auto 0 !important; color: var(--riff-muted); font-size: 13px; }
.riff-home__section { width: min(100%, 760px); margin: 0 auto; padding-top: 28px; }
.riff-home__section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
.riff-home__section h2 { font-size: 20px; letter-spacing: -.025em; }
.riff-home__section-note { color: var(--riff-muted); font-size: 13px; }
.riff-home__library { min-height: 32px; padding: 6px 12px; border-color: #DDE5F1; border-radius: var(--riff-radius-control); color: #425779; background: rgba(255,255,255,.65); font-size: 12px; }
.riff-home__library strong { font-weight: 500; }
.riff-home__recent { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 20px; align-items: center; padding: 22px; border: 1px solid var(--riff-line); border-radius: var(--riff-radius-surface); background: var(--riff-surface); }
.riff-home__recent p { margin-top: 4px; color: var(--riff-muted); }
.riff-home__action { min-height: 44px; padding: 9px 17px; border-radius: var(--riff-radius-control); font-weight: 650; }
.riff-home__action--primary { color: #fff; border-color: var(--riff-primary); background: var(--riff-primary); }
.riff-home__error { padding: 14px 16px; border: 1px solid var(--riff-line); border-radius: 14px; color: var(--riff-muted); background: var(--riff-surface); }
@media (max-width: 800px) {
  .riff-home__intro { max-width: 560px; }
}
@media (max-width: 480px) {
  .riff-home { padding-left: calc(16px + var(--riff-safe-left, 0px)); padding-right: calc(16px + var(--riff-safe-right, 0px)); }
  .riff-home__hero { padding-top: 12px; }
  .riff-home h1 { font-size: clamp(32px, 10vw, 40px); }
  .riff-home__shortcuts { justify-content: flex-start; }
  .riff-home__composer-footer { align-items: stretch; flex-direction: column; }
  .riff-home__upload, .riff-home__send { width: 100%; }
  .riff-home__recent { grid-template-columns: 1fr; }
}
`;

const libraries = [
  ['videos', 'Trending videos', 'evidence-backed video directions'],
  ['hooks', 'Hooks', 'opening ideas'],
  ['showcases', 'Product showcases', 'product-led formats'],
  ['ctas', 'Calls to action', 'closing ideas'],
] as const;

export function mountRiffHome(root: HTMLElement, send: RiffPanelAction): {
  render(state: RiffHomeState): void;
  dispose(): void;
} {
  const doc = root.ownerDocument;
  const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className = '') => {
    const item = doc.createElement(tag); item.className = className;
    if (text !== undefined) item.textContent = text;
    return item;
  };
  const style = node('style'); style.textContent = homeStyles;
  const app = node('main', undefined, 'riff-app riff-home');
  const shell = node('div', undefined, 'riff-home__shell');
  const header = node('header', undefined, 'riff-home__header');
  const brand = node('div', undefined, 'riff-home__brand'); brand.append(riffLockup(doc));
  const account = node('p', 'Connecting…', 'riff-home__account');
  header.append(brand, account);
  const hero = node('section', undefined, 'riff-home__hero');
  const heading = node('h1', 'Let’s make your next video go viral.');
  const intro = node('p', 'Start with a creator, a video, or a rough idea. Riff keeps the evidence and the making flow together.', 'riff-home__intro');
  hero.append(heading, intro);
  const form = node('form', undefined, 'riff-home__composer');
  form.setAttribute('aria-label', 'Start with Riff');
  const shortcuts = node('div', undefined, 'riff-home__shortcuts');
  const libraryButtons: Array<[HTMLButtonElement, string, string]> = [];
  for (const [kind, title, request] of libraries) {
    const button = node('button', undefined, 'riff-home__library'); button.type = 'button'; button.dataset.library = kind; button.dataset.kind = kind;
    button.append(node('strong', title)); shortcuts.append(button); libraryButtons.push([button, title, request]);
  }
  const inputShell = node('div', undefined, 'riff-home__input-shell');
  const input = node('textarea');
  input.placeholder = 'Share a video or profile link, or tell me what you want to make…';
  input.setAttribute('aria-label', input.placeholder);
  const footer = node('div', undefined, 'riff-home__composer-footer');
  const upload = node('button', 'Upload a video', 'riff-home__upload'); upload.type = 'button';
  upload.setAttribute('aria-describedby', 'riff-upload-help');
  const uploadHelp = node('span', 'Attach your video in ChatGPT after this handoff.', 'riff-home__section-note');
  uploadHelp.id = 'riff-upload-help'; uploadHelp.hidden = true;
  const submit = node('button', 'Find my next idea', 'riff-home__send'); submit.type = 'submit';
  footer.append(upload, uploadHelp, submit); inputShell.append(input, footer); form.append(shortcuts, inputShell);
  const status = node('p', '', 'riff-home__status');
  status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const invoke = async (prompt: string) => {
    status.textContent = 'Sending to ChatGPT…';
    for (const control of app.querySelectorAll<HTMLButtonElement>('button')) control.disabled = true;
    try { const result = await send(prompt); status.textContent = result.message; }
    catch { status.textContent = 'Riff could not hand this off. Continue in the ChatGPT composer.'; }
    finally { for (const control of app.querySelectorAll<HTMLButtonElement>('button')) control.disabled = false; }
  };
  form.addEventListener('submit', (event) => {
    event.preventDefault(); const value = input.value.trim();
    if (!value) { status.textContent = 'Add a creator link, video link, or idea first.'; input.focus(); return; }
    void invoke(`Use Riff to help me make my next video from this input:\n\n${value}`);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) form.requestSubmit();
  });
  upload.addEventListener('click', () => void invoke('I want to analyze a video with Riff. Ask me to attach the video in ChatGPT, and explain the supported next step without claiming the file has already been uploaded.'));
  for (const [button, title, request] of libraryButtons) button.addEventListener('click', () => void invoke(
    `Use Riff to explore ${request} for my next creator video. Ground suggestions in my saved creator context and current evidence. The selected shortcut was ${title}.`,
  ));
  const recentSection = node('section', undefined, 'riff-home__section');
  const recentHead = node('div', undefined, 'riff-home__section-head'); recentHead.append(node('h2', 'Pick up where you left off'));
  const recent = node('div', undefined, 'riff-home__recent');
  const empty = node('div'); empty.append(node('strong', 'No recent work is available here yet.'), node('p', 'Ask ChatGPT to reopen a saved Riff job by its job ID, or start a new creator flow.'));
  const create = node('button', 'Create a video', 'riff-home__action riff-home__action--primary'); create.type = 'button';
  create.addEventListener('click', () => void invoke('Use Riff to create my next video. Start by asking for a creator profile or video link, my goal, and any product or filming constraints that are still missing.'));
  recent.append(empty, create); recentSection.append(recentHead, recent);
  shell.append(header, hero, form, status, recentSection); app.append(shell); root.replaceChildren(style, app);
  let disposed = false;
  return {
    render(state) {
      if (disposed) return;
      if (state.status === 'loading') { account.textContent = 'Connecting…'; return; }
      if (state.status === 'error') { account.textContent = 'Account unavailable'; status.textContent = state.message; return; }
      account.textContent = `Ready, ${state.account.name}`;
      if (/Reconnect|incomplete|could not/i.test(status.textContent)) status.textContent = '';
    },
    dispose() { disposed = true; root.replaceChildren(); },
  };
}
