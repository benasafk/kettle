import { seedVideoReview } from '../seed-video-review.ts';
import type { CreatorJobView, PipelineReference } from '../../../packages/contracts/creator-pipeline.ts';
import { mountCreatorReview } from '../creator-loop/index.ts';
import { creatorReviewStyles } from '../creator-loop/styles.ts';
import { creatorPipelineStyles } from './styles.ts';

/** Read-only presentation. The host validates and authorizes the public job envelope. */
export function mountCreatorPipeline(root: HTMLElement): {
  render(job: CreatorJobView): void;
  dispose(): void;
} {
  const doc = root.ownerDocument;
  function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className = '') {
    const node = doc.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  const wrapper = el('div', undefined, 'kettle-creator kettle-pipeline');
  const card = el('section', undefined, 'kc-card kc-stack');
  card.setAttribute('aria-label', 'Creator pipeline');
  const content = el('div', undefined, 'kc-stack');
  const status = el('p', 'Waiting for job details.', 'kc-meta');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  card.append(content, status);
  wrapper.append(el('style', creatorReviewStyles + creatorPipelineStyles), card);
  root.replaceChildren(wrapper);
  let disposed = false;
  let identity: string | undefined;
  let dnaView: ReturnType<typeof mountCreatorReview> | undefined;
  const date = (value: string | null) => value === null ? 'Unknown' : value.replace('T', ' ').replace(/Z$/, ' UTC');
  function rows(values: Array<[string, string]>) {
    const list = el('dl');
    for (const [label, value] of values) {
      const row = el('div', undefined, 'kc-row');
      row.append(el('dt', label), el('dd', value));
      list.append(row);
    }
    return list;
  }
  function field(parent: HTMLElement, title: string, value: string) {
    const group = el('div');
    group.append(el('h4', title), el('p', value, 'kc-text'));
    parent.append(group);
  }
  function list(parent: HTMLElement, title: string, values: string[]) {
    const group = el('div');
    group.append(el('h4', title));
    if (!values.length) group.append(el('p', 'None supplied.', 'kc-meta'));
    else {
      const items = el('ul');
      values.forEach(value => items.append(el('li', value, 'kc-text')));
      group.append(items);
    }
    parent.append(group);
  }
  function disclosure(title: string, key: string) {
    const details = el('details', undefined, 'kc-stack');
    details.dataset.key = key;
    const summary = el('summary', title);
    summary.dataset.focus = key;
    details.append(summary);
    return details;
  }
  function reference(ref: PipelineReference, fictional: boolean, key: string, index: number) {
    const block = el('div', undefined, 'kc-observation kc-stack');
    block.append(el('h4', `Reference ${index + 1} · TikTok`), el('p', ref.caption ?? 'Caption unknown', 'kc-text'), rows([
      ['Reference ID', ref.id], ['Origin', ref.origin === 'fixture' ? 'Fictional test data' : 'Provider observation'],
      ['Published', date(ref.published_at)], ['Retrieved', date(ref.retrieved_at)],
      ['Views', ref.views === null ? 'Unknown' : String(ref.views)],
    ]));
    let href: string | undefined;
    if (!fictional) {
      try {
        const url = new URL(ref.url);
        if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) href = url.href;
      } catch { /* Malformed links remain inert. */ }
    }
    if (href) {
      const link = el('a', 'Open reference (new tab)', 'kc-source');
      link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.referrerPolicy = 'no-referrer';
      link.dataset.focus = key;
      block.append(link, el('p', ref.url, 'kc-meta'));
    } else block.append(el('p', fictional ? `Fictional source: ${ref.url}` : 'Source link unavailable.', 'kc-meta'));
    list(block, 'Reference limitations', ref.limitations);
    return block;
  }
  function provenance(fictional: boolean) {
    content.append(el('p', fictional
      ? 'Contains fictional test data. This is not live provider evidence.'
      : 'Based on the supplied evidence; opening this view does not fetch current data.', 'kc-notice'));
  }
  function lineage(version: number, dnaId: string, createdAt: string) {
    content.append(rows([['Captured DNA version', String(version)], ['DNA ID', dnaId], ['Created', date(createdAt)]]),
      el('p', `Uses captured DNA version ${version}. Later DNA corrections do not change this result.`, 'kc-meta'));
  }
  function render(job: CreatorJobView) {
    if (disposed) return;
    const nextIdentity = `${job.project_id}:${job.id}`;
    const same = identity === nextIdentity;
    const active = doc.activeElement as HTMLElement | null;
    const hadFocus = !!active && content.contains(active);
    const focused = same && hadFocus ? active?.dataset.focus : undefined;
    const hadDisclosures = !!content.querySelector('details');
    const open = new Set(same ? [...content.querySelectorAll<HTMLDetailsElement>('details[open]')].map(n => n.dataset.key) : []);
    dnaView?.dispose(); dnaView = undefined;
    const heading = el('h2', { scan: 'Creator scan', recommendations: 'Personalized ideas', scripts: 'Filming variants' }[job.kind]);
    heading.tabIndex = -1;
    content.replaceChildren(heading);
    identity = nextIdentity;
    content.append(rows([['Job updated', date(job.updated_at)]]));
    const labels = { queued: 'Queued', running: 'In progress', failed: 'Job failed', needs_reconciliation: 'Outcome needs review', succeeded: 'Complete' };
    content.append(el('p', labels[job.state], 'kc-basis'));
    if (job.message) content.append(el('p', job.message, 'kc-text'));
    let outcome = `${heading.textContent}: ${labels[job.state]}.${job.message ? ` ${job.message}` : ''}`;
    if (job.state === 'queued' || job.state === 'running') {
      content.append(el('p', 'Ask Kettle in chat to check this job. Checking its status does not start another generation.', 'kc-notice'));
    } else if (job.state === 'failed') {
      content.append(el('p', 'Ask Kettle in chat to review the failure before starting another job. This view does not retry it.', 'kc-notice'));
      outcome += ' Review the failure in chat before starting another job.';
    } else if (job.state === 'needs_reconciliation') {
      content.append(el('p', 'The outcome is uncertain. Ask Kettle in chat to reconcile this job before retrying or starting paid work. This view does not retry it.', 'kc-notice'));
      outcome += ' Ask Kettle in chat to reconcile this job before retrying.';
    } else if (job.result?.kind === 'scan') {
      if (job.result.dna.seed_review) content.append(seedVideoReview(doc, job.result.dna.seed_review));
      const host = el('div'); content.append(host);
      dnaView = mountCreatorReview(host);
      dnaView.render({kind: 'saved', dna: job.result.dna, preview: false});
      content.append(el('p', `To get ideas, ask Kettle in chat to use DNA version ${job.result.dna.version}. Corrections stay in chat.`, 'kc-notice'));
    } else if (job.result?.kind === 'recommendations') {
      const batch = job.result.batch;
      const fictional = batch.contains_fixture_data || batch.references.some(r => r.origin === 'fixture');
      provenance(fictional); lineage(batch.dna_version, batch.dna_id, batch.created_at);
      content.append(rows([['Batch ID', batch.id]]));
      list(content, 'Batch limitations', batch.limitations);
      if (!batch.ideas.length) content.append(el('p', 'No evidence-backed ideas returned. Ask Kettle in chat about the limitations or a different direction.', 'kc-notice'));
      const refs = new Map(batch.references.map(ref => [ref.id, ref]));
      for (const [i, idea] of batch.ideas.entries()) {
        const block = el('article', undefined, 'kc-claim kc-stack');
        block.append(el('h3', `Idea ${i + 1} · ${idea.title}`));
        if (idea.reference_ids.some(id => !refs.has(id))) {
          block.append(el('p', 'Idea withheld: supporting references are unavailable.', 'kc-notice'));
        } else {
          field(block, 'Concept', idea.concept); field(block, 'Why it fits', idea.creator_fit);
          field(block, 'Evidence', idea.evidence_summary); field(block, 'How to film it', idea.execution);
          list(block, 'Idea limitations', idea.limitations);
          const evidence = disclosure(`References for idea ${i + 1} · ${idea.title}`, `idea-${idea.id}`);
          idea.reference_ids.forEach((id, index) => evidence.append(reference(refs.get(id)!, fictional, `ref-${idea.id}-${id}`, index)));
          block.append(evidence, el('p', `To request filming variants, tell Kettle in chat: “Use idea ${i + 1}: ${idea.title} from batch ${batch.id}.”`, 'kc-notice'), rows([['Idea ID', idea.id]]));
        }
        content.append(block);
      }
      outcome += ` ${batch.ideas.length} ${batch.ideas.length === 1 ? 'idea' : 'ideas'}. Captured DNA version ${batch.dna_version}.${fictional ? ' Contains fictional test data.' : ''}`;
    } else if (job.result?.kind === 'scripts') {
      const scripts = job.result.scripts;
      provenance(scripts.contains_fixture_data); lineage(scripts.dna_version, scripts.dna_id, scripts.created_at);
      content.append(rows([['Batch ID', scripts.batch_id], ['Idea ID', scripts.idea_id], ['Script version', String(scripts.version)]]),
        el('p', 'Reference IDs below refer to the selected recommendation batch. Ask Kettle in chat to reopen that batch for source links and dates.', 'kc-meta'));
      list(content, 'Script set limitations', scripts.limitations);
      for (const variant of scripts.variants) {
        const block = disclosure(`${variant.label} · about ${variant.estimated_duration_seconds} seconds`, `variant-${variant.id}`);
        block.classList.add('kc-claim');
        block.open = scripts.variants[0] === variant;
        field(block, 'Hook', variant.hook); field(block, 'Opening visual', variant.opening_visual);
        field(block, 'Script', variant.script); list(block, 'Shots', variant.shots);
        list(block, 'B-roll', variant.b_roll); list(block, 'On-screen text', variant.on_screen_text);
        field(block, 'Showcase timing', variant.showcase_timing); field(block, 'Call to action', variant.cta);
        field(block, 'Pacing', variant.pacing); list(block, 'Reference IDs', variant.reference_ids);
        list(block, 'Variant limitations', variant.limitations);
        content.append(block);
      }
      content.append(el('p', 'Tell Kettle in chat which variant you want to refine. Opening a variant does not generate or save changes.', 'kc-notice'));
      outcome += ` ${scripts.variants.length} variants. Captured DNA version ${scripts.dna_version}.${scripts.contains_fixture_data ? ' Contains fictional test data.' : ''}`;
    }
    if (same && hadDisclosures) for (const node of content.querySelectorAll<HTMLDetailsElement>('details')) node.open = open.has(node.dataset.key);
    if (hadFocus) ([...content.querySelectorAll<HTMLElement>('[data-focus]')].find(n => n.dataset.focus === focused) ?? heading).focus({preventScroll: true});
    if (status.textContent !== outcome) status.textContent = outcome;
  }
  return { render, dispose() { disposed = true; dnaView?.dispose(); dnaView = undefined; wrapper.remove(); } };
}
