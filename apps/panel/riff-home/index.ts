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
.riff-home { min-height: 100vh; padding: calc(24px + var(--riff-safe-top, 0px)) calc(24px + var(--riff-safe-right, 0px)) calc(32px + var(--riff-safe-bottom, 0px)) calc(24px + var(--riff-safe-left, 0px)); background: var(--riff-canvas); }
.riff-home__shell { width: min(100%, 1180px); margin: 0 auto; }
.riff-home__header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.riff-home__brand { width: 110px; height: 40px; color: var(--riff-ink); }
.riff-home__account { max-width: 50%; color: var(--riff-muted); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.riff-home__hero { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(260px, .55fr); gap: 32px; align-items: end; padding: clamp(42px, 8vw, 92px) 0 36px; }
.riff-home h1 { max-width: 820px; font-size: clamp(40px, 7vw, 84px); line-height: .96; letter-spacing: -.065em; text-wrap: balance; }
.riff-home__intro { color: var(--riff-muted); font-size: 16px; }
.riff-home__composer { padding: 10px; border: 1px solid var(--riff-line); border-radius: 24px; background: var(--riff-surface); box-shadow: 0 14px 42px rgba(36,36,38,.08); }
.riff-home__composer textarea { display: block; width: 100%; min-height: 98px; resize: vertical; padding: 14px; border: 0; outline: 0; color: var(--riff-ink); background: transparent; }
.riff-home__composer textarea::placeholder { color: var(--riff-muted); opacity: 1; }
.riff-home__composer-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.riff-home__upload, .riff-home__send, .riff-home__action, .riff-home__library { border: 1px solid var(--riff-line); color: var(--riff-ink); background: var(--riff-surface); cursor: pointer; }
.riff-home__upload { min-height: 42px; padding: 8px 15px; border-radius: var(--riff-radius-control); }
.riff-home__send { width: 42px; height: 42px; border: 0; border-radius: 50%; color: #fff; background: var(--riff-primary); font-size: 22px; }
.riff-home__status { min-height: 24px; margin-top: 10px !important; color: var(--riff-muted); font-size: 13px; }
.riff-home__section { padding-top: 34px; }
.riff-home__section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
.riff-home__section h2 { font-size: 20px; letter-spacing: -.025em; }
.riff-home__section-note { color: var(--riff-muted); font-size: 13px; }
.riff-home__libraries { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.riff-home__library { min-height: 132px; padding: 18px; border-radius: var(--riff-radius-surface); text-align: left; }
.riff-home__library strong, .riff-home__library span { display: block; }
.riff-home__library strong { font-size: 17px; }
.riff-home__library span { margin-top: 7px; color: var(--riff-muted); font-size: 13px; }
.riff-home__library[data-kind="hooks"] { background: var(--riff-hook-soft); border-color: color-mix(in srgb, var(--riff-hook) 22%, transparent); }
.riff-home__library[data-kind="showcases"] { background: var(--riff-showcase-soft); border-color: color-mix(in srgb, var(--riff-showcase) 22%, transparent); }
.riff-home__library[data-kind="ctas"] { background: var(--riff-cta-soft); border-color: color-mix(in srgb, var(--riff-cta) 22%, transparent); }
.riff-home__recent { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 20px; align-items: center; padding: 22px; border: 1px solid var(--riff-line); border-radius: var(--riff-radius-surface); background: var(--riff-surface); }
.riff-home__recent p { margin-top: 4px; color: var(--riff-muted); }
.riff-home__action { min-height: 44px; padding: 9px 17px; border-radius: var(--riff-radius-control); font-weight: 650; }
.riff-home__action--primary { color: #fff; border-color: var(--riff-primary); background: var(--riff-primary); }
.riff-home__error { padding: 14px 16px; border: 1px solid var(--riff-line); border-radius: 14px; color: var(--riff-muted); background: var(--riff-surface); }
@media (max-width: 800px) {
  .riff-home__hero { grid-template-columns: 1fr; align-items: start; }
  .riff-home__libraries { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 480px) {
  .riff-home { padding-left: calc(16px + var(--riff-safe-left, 0px)); padding-right: calc(16px + var(--riff-safe-right, 0px)); }
  .riff-home__hero { padding-top: 44px; gap: 18px; }
  .riff-home h1 { font-size: clamp(39px, 14vw, 58px); }
  .riff-home__libraries { grid-template-columns: 1fr; }
  .riff-home__library { min-height: 104px; }
  .riff-home__recent { grid-template-columns: 1fr; }
}
`;

const libraries = [
  ['hooks', 'Hooks', 'Find an opening that earns the next second.'],
  ['showcases', 'Product showcases', 'Explore ways to make the product the proof.'],
  ['ctas', 'CTAs', 'Land the action without losing your voice.'],
  ['inspiration', 'Find my next idea', 'Find patterns worth adapting, not copying.'],
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
  const input = node('textarea');
  input.placeholder = 'Share a video or profile link, or tell me what you want to make…';
  input.setAttribute('aria-label', input.placeholder);
  const footer = node('div', undefined, 'riff-home__composer-footer');
  const upload = node('button', 'Upload a video', 'riff-home__upload'); upload.type = 'button';
  upload.setAttribute('aria-describedby', 'riff-upload-help');
  const uploadHelp = node('span', 'Attach your video in ChatGPT after this handoff.', 'riff-home__section-note');
  uploadHelp.id = 'riff-upload-help'; uploadHelp.hidden = true;
  const submit = node('button', '↑', 'riff-home__send'); submit.type = 'submit'; submit.setAttribute('aria-label', 'Send to Riff');
  footer.append(upload, uploadHelp, submit); form.append(input, footer);
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
  const librarySection = node('section', undefined, 'riff-home__section');
  const libraryHead = node('div', undefined, 'riff-home__section-head');
  libraryHead.append(node('h2', 'Creator libraries'), node('p', 'Explore with your creator context', 'riff-home__section-note'));
  const grid = node('div', undefined, 'riff-home__libraries');
  for (const [kind, title, detail] of libraries) {
    const button = node('button', undefined, 'riff-home__library'); button.type = 'button'; button.dataset.library = kind; button.dataset.kind = kind;
    button.append(node('strong', title), node('span', detail));
    button.addEventListener('click', () => void invoke(`Use Riff to explore ${title.toLowerCase()} for my next creator video. Ground suggestions in my saved creator context and current evidence.`));
    grid.append(button);
  }
  librarySection.append(libraryHead, grid);
  const recentSection = node('section', undefined, 'riff-home__section');
  const recentHead = node('div', undefined, 'riff-home__section-head'); recentHead.append(node('h2', 'Pick up where you left off'));
  const recent = node('div', undefined, 'riff-home__recent');
  const empty = node('div'); empty.append(node('strong', 'No recent work is available here yet.'), node('p', 'Ask ChatGPT to reopen a saved Riff job by its job ID, or start a new creator flow.'));
  const create = node('button', 'Create a video', 'riff-home__action riff-home__action--primary'); create.type = 'button';
  create.addEventListener('click', () => void invoke('Use Riff to create my next video. Start by asking for a creator profile or video link, my goal, and any product or filming constraints that are still missing.'));
  recent.append(empty, create); recentSection.append(recentHead, recent);
  shell.append(header, hero, form, status, librarySection, recentSection); app.append(shell); root.replaceChildren(style, app);
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
