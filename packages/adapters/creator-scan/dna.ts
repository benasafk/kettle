import { CreatorAnalysis, ProfileScanResult, type DnaClaim, type VideoObservation } from '../../contracts/creator-profile.ts';

/** Conservative deterministic baseline. Does not execute captions, fetch media,
 * call models, accept caller-authored claims, or infer visual behavior from text.
 */
export function buildGroundedCreatorDna(rawScan: unknown, options: {
  id: string; created_at: string;
}, newId: () => string = () => crypto.randomUUID()): CreatorAnalysis {
  const scan = ProfileScanResult.parse(rawScan);
  if (!scan.profile || !['complete', 'partial'].includes(scan.status)) {
    throw new Error('Creator DNA requires a resolved complete or partial scan');
  }
  const allowed = scan.video_observations.filter(o =>
    o.provenance.permission.status !== 'needs_review' &&
    o.provenance.permission.permitted_uses.includes('model_processing'));
  // One observation per video for statistics. All conflicting observations remain
  // in the unchanged scan. Cache/source time takes precedence over retrieval time.
  const selected = new Map<string, VideoObservation>();
  const effectiveTime = (o: VideoObservation) => Date.parse(o.provenance.source_observed_at ?? o.provenance.retrieved_at);
  for (const o of allowed) {
    const key = `${o.video.platform}:${o.video.native_id}`;
    const prior = selected.get(key);
    if (!prior || effectiveTime(o) > effectiveTime(prior) ||
      (effectiveTime(o) === effectiveTime(prior) && o.id < prior.id)) selected.set(key, o);
  }
  const videos = [...selected.values()];
  const claims: DnaClaim[] = [];
  const add = (dimension: DnaClaim['dimension'], statement: string, basis: DnaClaim['basis'],
    rows: VideoObservation[], modality: 'caption' | 'metadata', method: string, uncertainty: string) => {
    if (!rows.length) return;
    claims.push({ id: newId(), dimension, statement, basis, requires_video: false,
      evidence: rows.map(o => ({ observation_id: o.id, modality, start_seconds: null, end_seconds: null })),
      method, uncertainty, supersedes_claim_id: null });
  };
  const captions = videos.filter(o => o.caption !== null && o.provenance.modalities.includes('caption'));
  const metadata = videos.filter(o => o.provenance.modalities.includes('metadata'));
  // Intentionally small English baseline, not a general semantic classifier.
  const topics = [
    ['desk setups', /\b(desk|workspace)\b/i], ['travel', /\b(travel|trip|vacation)\b/i],
    ['golf', /\bgolf\b/i], ['cooking', /\b(recipe|cooking|baking)\b/i],
  ] as const;
  for (const [topic, pattern] of topics) {
    const matches = captions.filter(o => pattern.test(o.caption!));
    add('topics', `${matches.length} of ${captions.length} eligible video captions mention ${topic}.`,
      'observed', matches, 'caption', 'Bounded English keyword matching on distinct video captions.',
      'Caption wording does not establish the visual topic or a recurring whole-profile pattern.');
    if (matches.length >= 2) add('audience',
      `The caption sample suggests intended appeal to people interested in ${topic}; actual audience interests are unknown.`,
      'inferred', matches, 'caption', 'Tentative intended-audience hypothesis from repeated caption topics.',
      'No follower demographics, interests or purchase intent were observed. User confirmation is needed.');
  }
  const questions = captions.filter(o => /^[^.!?]{1,200}\?/.test(o.caption!));
  add('hooks', `${questions.length} eligible captions begin with a question.`, 'observed', questions, 'caption',
    'Question punctuation near the beginning of the caption.',
    'Caption openings are not proof of the spoken or visual opening.');
  const ctas = captions.filter(o => /\b(follow|save|share|comment)\s+(me|this|for|your|below|to)\b/i.test(o.caption!));
  add('cta', `${ctas.length} eligible captions contain a possible follow/save/share/comment request.`,
    'inferred', ctas, 'caption', 'Small English caption phrase matcher.',
    'Quoted or negated language can match; no on-screen or spoken CTA was verified.');
  const durations = metadata.filter(o => o.duration_seconds !== null);
  if (durations.length) {
    const sorted = durations.map(o => o.duration_seconds!).sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
    add('duration', `Median supplied duration is ${median} seconds across ${durations.length} distinct sampled videos.`,
      'observed', durations, 'metadata', 'Median of non-null provider durations; one dated observation per video.',
      'Reported duration does not establish shot frequency, editing speed or time to payoff.');
  }
  const views = metadata.filter(o => o.metrics.views !== null);
  if (views.length >= 3) {
    const counts = views.map(o => o.metrics.views!);
    add('relative_performance', `Recorded views range from ${Math.min(...counts)} to ${Math.max(...counts)} across ${views.length} distinct sampled videos.`,
      'observed', views, 'metadata', 'Descriptive range of non-null counts; no engagement score or causal ranking.',
      'Video age, exposure, format and metric observation dates may differ. This does not identify winning creative traits.');
  }
  return CreatorAnalysis.parse({ scan, dna: {
    id: options.id, profile: scan.profile, version: 1, created_at: options.created_at,
    source_scan_id: scan.id, analyzer_version: 'deterministic-caption-metadata-v1', taxonomy_version: 'creator-dna-v1',
    claims, limitations: [
      'Small deterministic English caption/metadata baseline; not a model or validated recommendation engine.',
      'Actual audience, visual hooks, formats, showcase, structure and pacing remain unknown; no video analysis was performed.',
      'Duplicate videos contribute once, using latest source-observed time when present, otherwise retrieval time; ties use observation ID.',
      'Unknown observation freshness and incomparable publication ages prevent causal or normalized performance conclusions.',
      `${scan.video_observations.length - allowed.length} observations excluded because analysis permission was unavailable.`,
      ...(claims.length ? [] : ['No supported claims found; no substitute claims were invented.']),
    ],
  } });
}
