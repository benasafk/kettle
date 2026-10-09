import { z } from 'zod';
import { CreatorDnaView } from '../../contracts/creator-operations.ts';
import { CreatorAnalysis, ProfileScanRequest, ObservationProvenance } from '../../contracts/creator-profile.ts';
import { RecommendationBatch, CreatorScriptSet, FilmingVariant,
  type CreatorPipelineProvider, type CreatorProviderContext } from '../../contracts/creator-pipeline.ts';
import { buildGroundedCreatorDna } from '../creator-scan/dna.ts';
import { characterizeFeed, characterizeProfile } from '../creator-scan/scrapecreators-characterization.ts';
import { boundedJson, type Fetch } from './http.ts';
import { normalizeLiveTikTokScan, type ScanReceipt } from './live-scan.ts';
import { parseTikTokUrl } from './tiktok-url.ts';
import { readTikTokDetail } from './detail-json.ts';
import { readLightreelSubmission, readLightreelHistory } from './lightreel-json.ts';
import { readOpenAiResponse } from './openai-json.ts';
import { profileRequest, feedRequest, detailRequest, researchBody, historyRequest, scriptBody } from './requests.ts';
import { receiptIds } from './ids.ts';
import { sanitizedScrape, sourceObservedAt } from './sanitize.ts';

// Durable success receipt, not a parallel business/result schema.
const receipt = z.object({ id: z.uuid(), status: z.number().int().min(200).max(299),
  body: z.string().max(262144), retrieved_at: z.iso.datetime(), latency_ms: z.number().int().nonnegative(),
  failure: z.null(), source_observed_at: z.iso.datetime().nullable() });
/** Error text is safe to persist. Any dispatched failure may have incurred cost; never retry here. */
export class CreatorProviderError extends Error {
  constructor(readonly code: 'transport' | 'malformed' | 'permission' | 'unavailable',
    readonly status: number | null = null) { super(`creator_provider_${code}`); }
}
export type CreatorPipelineAdapterOptions = {
  fetch: Fetch;
  credentials: { scrapeCreators: string; lightreel: string; openai: string };
  model: string; maxOutputTokens: number; region: string;
  permission: z.infer<typeof ObservationProvenance>['permission'];
  /** Trusted server checks underlying source/model rights; the display view alone cannot establish them. */
  canProcessDna(dna: CreatorDnaView): boolean;
  /** Upper bound on known-ID history reads in this invocation; no retry of research POST. */
  maxHistoryReads?: number;
  timeouts?: { scrapeMs?: number; researchMs?: number; modelMs?: number };
};
const modelOutput = z.strictObject({ variants: z.array(FilmingVariant.omit({ id: true })).min(2).max(3) });
const modelSchema = z.toJSONSchema(modelOutput) as Record<string, unknown>;

export function createCreatorPipelineProvider(options: CreatorPipelineAdapterOptions): CreatorPipelineProvider {
  const permission = ObservationProvenance.shape.permission.parse(options.permission);
  const credentials = { ...options.credentials };
  if (typeof options.canProcessDna !== 'function') throw new CreatorProviderError('permission');
  if (permission.status !== 'approved' || !['store', 'display', 'model_processing'].every(p =>
    permission.permitted_uses.includes(p as 'store' | 'display' | 'model_processing'))) throw new CreatorProviderError('permission');
  if (Object.values(credentials).some(k => !k || /[\r\n]/.test(k))) throw new Error('Missing provider credential');
  const maxHistoryReads = options.maxHistoryReads ?? 0;
  if (!Number.isInteger(maxHistoryReads) || maxHistoryReads < 0 || maxHistoryReads > 3) throw new Error('Invalid history bound');
  if (!/^[A-Z]{2}$/.test(options.region)) throw new Error('Invalid region');
  // Validate model configuration without executing or reading environment variables.
  scriptBody(options.model, options.maxOutputTokens, {}, modelSchema);
  const timeouts = { scrape: options.timeouts?.scrapeMs ?? 30_000,
    research: options.timeouts?.researchMs ?? 180_000, model: options.timeouts?.modelMs ?? 60_000 };
  for (const n of Object.values(timeouts)) if (!Number.isInteger(n) || n < 1 || n > 600_000) throw new Error('Invalid timeout');
  const provenance = (r: ScanReceipt, endpoint: string, source_url: string) => ObservationProvenance.parse({
    provider: 'scrapecreators', endpoint, origin: 'live', retrieved_at: r.retrieved_at,
    source_observed_at: r.source_observed_at, source_url, permission, modalities: ['metadata'],
  });
  const checkDna = (raw: CreatorDnaView) => {
    const dna = CreatorDnaView.parse(raw);
    if (dna.contains_fixture_data || dna.evidence.some(e => e.origin !== 'live') || options.canProcessDna(dna) !== true) {
      throw new CreatorProviderError('permission');
    }
    return dna;
  };
  async function call(context: CreatorProviderContext, key: string,
    provider: 'scrapecreators' | 'lightreel' | 'openai',
    operation: 'profile' | 'feed' | 'research' | 'poll' | 'video' | 'generate',
    url: URL, body: string | undefined, decode: (body: string) => string) {
    const raw = await context.call(key, provider, operation, async () => {
      const apiKey = provider === 'scrapecreators' ? credentials.scrapeCreators : provider === 'lightreel' ? credentials.lightreel : credentials.openai;
      const r = await boundedJson(options.fetch, url, { method: body === undefined ? 'GET' : 'POST',
        headers: { ...(provider === 'scrapecreators' ? { 'x-api-key': apiKey } : { Authorization: `Bearer ${apiKey}` }),
          'Content-Type': 'application/json', Accept: 'application/json' }, body },
      { timeoutMs: operation === 'poll' ? Math.min(timeouts.research, 30_000) :
        provider === 'scrapecreators' ? timeouts.scrape : provider === 'lightreel' ? timeouts.research : timeouts.model });
      if (r.failure !== null) throw new CreatorProviderError('transport', r.status);
      try {
        const source_observed_at = provider === 'scrapecreators' ? sourceObservedAt(r.body) : null;
        return receipt.parse({ ...r, id: context.newId(), source_observed_at, body: decode(r.body) });
      } catch { throw new CreatorProviderError('malformed', r.status); }
    });
    return receipt.parse(raw);
  }
  return {
    async scan(raw, context) {
      const request = ProfileScanRequest.parse(raw);
      if (request.max_pages > 2 || request.max_videos > 10) throw new Error('Pilot scan exceeds ten videos/two pages');
      const profile = await call(context, 'profile', 'scrapecreators', 'profile', profileRequest(request.supplied_url), undefined,
        body => {
          const clean = sanitizedScrape(body, 'profile');
          if (characterizeProfile(clean).kind === 'malformed') throw new Error('Invalid profile');
          return clean;
        });
      const parsed = characterizeProfile(profile.body);
      if (parsed.kind !== 'available' || parsed.user.uniqueId.toLowerCase() !== parseTikTokUrl(request.supplied_url).handle.toLowerCase()) {
        throw new CreatorProviderError('unavailable');
      }
      const pages: (ScanReceipt & { requestedCursor: string | null })[] = [];
      let cursor: string | null = null;
      for (let page = 0; page < request.max_pages; page++) {
        const r = await call(context, `feed:${page}`, 'scrapecreators', 'feed', feedRequest(request.supplied_url, options.region, cursor), undefined,
          body => sanitizedScrape(body, 'feed'));
        pages.push({ ...r, requestedCursor: cursor });
        const replay = characterizeFeed({ profileBody: profile.body, attempts: pages,
          maxPages: request.max_pages, maxVideos: request.max_videos });
        if (replay.pages.length !== pages.length) throw new CreatorProviderError('malformed');
        // A finite input replay ends here only when a valid next page can be requested.
        if (replay.stop !== 'replay_ended') break;
        cursor = replay.nextCursor;
      }
      const newId = await receiptIds(profile.id, 300);
      const scan = normalizeLiveTikTokScan({ id: newId(), created_at: profile.retrieved_at, request,
        profileAttempt: profile, feedAttempts: pages, permission,
        latency_ms: profile.latency_ms + pages.reduce((n, p) => n + p.latency_ms, 0) }, newId);
      return CreatorAnalysis.parse(buildGroundedCreatorDna(scan, { id: newId(), created_at: profile.retrieved_at }, newId));
    },
    async recommend(raw, context) {
      const dna = checkDna(raw);
      const query = researchBody({ profile: dna.profile, dna_version: dna.version,
        claims: dna.claims, limitations: dna.limitations });
      const research = await call(context, 'research', 'lightreel', 'research', new URL('https://api.lightreel.ai/v1/chat'), query,
        body => JSON.stringify(readLightreelSubmission(body)));
      let result = researchResult(research.body);
      // No invented status protocol: inspect only documented assistant history for a known ID.
      for (let read = 0; result.urls === null && read < maxHistoryReads; read++) {
        const id = result.conversationId;
        const history = await call(context, `poll:${read}`, 'lightreel', 'poll', historyRequest(id), undefined,
          body => JSON.stringify(readLightreelHistory(body, id)));
        result = researchResult(history.body);
      }
      if (result.urls === null) throw new CreatorProviderError('unavailable');
      const references: RecommendationBatch['references'] = [];
      for (const url of result.urls) {
        const nativeId = parseTikTokUrl(url).videoId!;
        const r = await call(context, `video:${nativeId}`, 'scrapecreators', 'video', detailRequest(url, options.region), undefined,
          body => {
            const clean = sanitizedScrape(body, 'video');
            // Identity check before storing a success; provenance is assigned below from receipt metadata.
            readTikTokDetail(clean, url, context.newId(), provenance({ id: context.newId(), status: 200,
              body: '', failure: null, latency_ms: 0, retrieved_at: context.now(), source_observed_at: null }, '/v2/tiktok/video', url));
            return clean;
          });
        const { observation: o } = readTikTokDetail(r.body, url, r.id, provenance(r, '/v2/tiktok/video', url));
        references.push({ id: o.id, platform: 'tiktok', native_id: o.video.native_id, url: o.canonical_url,
          retrieved_at: o.provenance.retrieved_at, published_at: o.published_at,
          caption: o.caption, views: o.metrics.views, origin: 'live', permission_basis: permission.basis,
          limitations: ['Caption and metadata only; no visual or pacing analysis.',
            'Views are an observation, not evidence of causal success or expected results.',
            o.provenance.source_observed_at ? `Provider cache observation time: ${o.provenance.source_observed_at}.` : 'Source observation time is unknown; retrieval time does not establish metric freshness.'] });
      }
      return buildRecommendations(dna, references, { newId: await receiptIds(research.id, 5), now: () => research.retrieved_at });
    },
    async generate(input, context) {
      const dna = checkDna(input.dna);
      const batch = RecommendationBatch.parse(input.batch);
      const idea = batch.ideas.find(i => i.id === input.idea_id);
      if (!idea || batch.dna_id !== dna.dna_id || batch.dna_version !== dna.version || batch.contains_fixture_data ||
        batch.references.some(r => r.origin !== 'live')) throw new Error('Selection or DNA lineage mismatch');
      const references = batch.references.filter(r => idea.reference_ids.includes(r.id));
      const body = scriptBody(options.model, options.maxOutputTokens,
        { idea, references, dna: { version: dna.version, claims: dna.claims, limitations: dna.limitations } }, modelSchema);
      const r = await call(context, 'generate', 'openai', 'generate', new URL('https://api.openai.com/v1/responses'), body,
        raw => {
          const response = readOpenAiResponse(raw);
          const output = modelOutput.parse(response.output);
          if (new Set(output.variants.map(v => v.label)).size !== output.variants.length ||
            output.variants.some(v => v.reference_ids.some(id => !idea.reference_ids.includes(id)))) throw new Error('Invalid grounding');
          return JSON.stringify({ ...response, output });
        });
      const output = modelOutput.parse(JSON.parse(r.body).output);
      // Revalidate after durable replay too; recorded output remains untrusted.
      if (output.variants.some(v => v.reference_ids.some(id => !idea.reference_ids.includes(id)))) throw new Error('Invalid grounding');
      const newId = await receiptIds(r.id, 4);
      return CreatorScriptSet.parse({ id: newId(), batch_id: batch.id, idea_id: idea.id,
        dna_id: dna.dna_id, dna_version: dna.version, version: 1, created_at: r.retrieved_at,
        variants: output.variants.map(v => ({ ...v, id: newId() })), contains_fixture_data: false,
        limitations: ['AI-generated proposals grounded in the selected evidence; human review required.',
          'Proposed visuals and pacing are filming instructions, not observed reference features or performance predictions.'] });
    },
  };
}
const researchResult = (body: string) => z.object({ conversationId: z.string().regex(/^[\w-]{1,200}$/),
  urls: z.array(z.string()).max(3).nullable() }).parse(JSON.parse(body));

function buildRecommendations(dna: CreatorDnaView, references: RecommendationBatch['references'], context: Pick<CreatorProviderContext, 'now' | 'newId'>) {
  const topical = dna.claims.filter(c => c.dimension === 'topics' || c.dimension === 'audience');
  const words = (s: string) => new Set(s.toLowerCase().match(/[a-z]{4,}/g)?.filter(w =>
    !['this','that','with','from','content','audience','inferred','topics','captions','about','their'].includes(w)) ?? []);
  const ideas: RecommendationBatch['ideas'] = [];
  for (const ref of references) {
    if (!ref.caption) continue;
    const tokens = words(ref.caption);
    const claim = topical.find(c => [...words(c.statement)].some(w => tokens.has(w)));
    if (!claim) continue;
    ideas.push({ id: context.newId(), title: `Test a creator-specific variation ${ideas.length + 1}`,
      concept: `Create an original video exploring your stated topic: ${claim.statement}`,
      creator_fit: `Uses DNA v${dna.version} (${claim.basis}): ${claim.statement}`.slice(0,3000),
      evidence_summary: `Reference caption shares topic language with this DNA claim. ${ref.views === null ? 'Views unavailable.' : `Observed views: ${ref.views}; no performance prediction.`}`,
      execution: 'Choose one concrete example from your own experience. State the problem, demonstrate your proposed change, and ask a relevant question. These are filming proposals, not observed reference structure.',
      reference_ids: [ref.id], limitations: ['Topic overlap is a lexical baseline, not a validated semantic relevance score.',
        claim.uncertainty, 'No measured audience demographics, visual analysis or causal performance claim.'] });
  }
  return RecommendationBatch.parse({ id: context.newId(), dna_id: dna.dna_id, dna_version: dna.version,
    created_at: context.now(), references, ideas, contains_fixture_data: false,
    limitations: ['Bounded Lightreel discovery with at most three ScrapeCreators metadata enrichments.',
      'Suggestions are testable proposals; human review should assess relevance.',
      ...(ideas.length ? [] : ['No caption/topic overlap supports a recommendation; correct or add topical DNA before another separately allocated search.'])] });
}
