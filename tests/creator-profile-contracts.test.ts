import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CreatorAnalysis, ProfileScanRequest, ProfileScanResult, CorrectCreatorDnaInput } from '../packages/contracts/creator-profile.ts';
import { creatorAnalysisFixture, partialScanFixture, unavailableScanFixture } from '../packages/contracts/fixtures/creator-profile.ts';

const reject = (edit: (v: ReturnType<typeof creatorAnalysisFixture>) => void) => {
  const v = creatorAnalysisFixture(); edit(v); assert.equal(CreatorAnalysis.safeParse(v).success, false);
};
test('shared fictional scans cover resolved, partial, unavailable, failed and empty samples', () => {
  CreatorAnalysis.parse(creatorAnalysisFixture());
  ProfileScanResult.parse(partialScanFixture());
  ProfileScanResult.parse(unavailableScanFixture());
  const failed = unavailableScanFixture(); failed.status = 'failed'; failed.coverage.stop_reason = 'error';
  ProfileScanResult.parse(failed);
  const empty = creatorAnalysisFixture().scan; empty.video_observations = []; empty.coverage.unique_videos = 0; empty.coverage.oldest_published_at = null; empty.coverage.newest_published_at = null;
  empty.coverage.pages[0]!.received_items = 0; empty.coverage.pages[0]!.admitted_observations = 0;
  ProfileScanResult.parse(empty);
});
test('metrics retain zero vs unknown; unsafe counts, dates and duration fail', () => {
  const v = CreatorAnalysis.parse(JSON.parse(JSON.stringify(creatorAnalysisFixture())));
  assert.equal(v.scan.video_observations[0]!.metrics.likes, 0);
  assert.equal(v.scan.video_observations[0]!.metrics.comments, null);
  for (const n of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) reject(v => { v.scan.video_observations[0]!.metrics.views = n; });
  reject(v => { v.scan.video_observations[0]!.published_at = 'yesterday'; });
  reject(v => { v.scan.video_observations[0]!.duration_seconds = 0; });
});
test('dated conflicting provider observations survive while duplicate IDs and false coverage fail', () => {
  const v = creatorAnalysisFixture(); const o = structuredClone(v.scan.video_observations[0]!);
  o.id = crypto.randomUUID(); o.metrics.views = 150; o.provenance.retrieved_at = '2026-10-10T12:00:00Z';
  v.scan.video_observations.push(o); v.scan.coverage.pages[0]!.received_items = 2; v.scan.coverage.pages[0]!.admitted_observations = 2;
  assert.equal(CreatorAnalysis.parse(v).scan.video_observations.length, 2);
  reject(v => { v.scan.video_observations.push(v.scan.video_observations[0]!); });
  reject(v => { v.scan.coverage.unique_videos = 2; });
  reject(v => { v.scan.coverage.pages_received = 2; });
  reject(v => { v.scan.video_observations[0]!.creator = { platform: 'tiktok', native_id: 'another-person' }; });
});
test('DNA requires matching scan, profile, observation and modality evidence', () => {
  reject(v => { v.dna.source_scan_id = crypto.randomUUID(); });
  reject(v => { v.dna.profile = { platform: 'instagram', native_id: 'other' }; });
  reject(v => { v.dna.claims[0]!.evidence[0]!.observation_id = crypto.randomUUID(); });
  reject(v => { v.dna.claims[0]!.evidence[0]!.modality = 'transcript'; });
  reject(v => { v.dna.claims[0]!.evidence = []; });
  reject(v => { v.scan.video_observations[0]!.provenance.permission.permitted_uses = ['display']; });
});
test('caption-only pacing cannot pass; permitted time-bounded video evidence can', () => {
  reject(v => { v.dna.claims[0]!.dimension = 'pacing'; });
  reject(v => { v.dna.claims[0]!.requires_video = true; });
  const v = creatorAnalysisFixture(); const o = v.scan.video_observations[0]!; const c = v.dna.claims[0]!;
  o.provenance.modalities.push('video'); o.provenance.permission.permitted_uses.push('media_analysis');
  c.dimension = 'pacing'; c.requires_video = true;
  c.evidence[0] = { observation_id: o.id, modality: 'video', start_seconds: 0, end_seconds: 10 };
  CreatorAnalysis.parse(v);
  c.evidence[0].end_seconds = 13; assert.equal(CreatorAnalysis.safeParse(v).success, false);
  c.evidence[0].end_seconds = 10; o.provenance.permission.permitted_uses = ['model_processing'];
  assert.equal(CreatorAnalysis.safeParse(v).success, false);
});
test('unknown costs remain unknown and ambiguous outcomes are preserved', () => {
  const v = creatorAnalysisFixture(); v.scan.cost.attempts.push({ id: crypto.randomUUID(), provider: 'fictional',
    outcome: 'ambiguous', credits: null, usd: null, usd_basis: 'unknown', conversion_basis: null });
  assert.equal(CreatorAnalysis.parse(v).scan.cost.attempts[0]!.usd, null);
  v.scan.cost.attempts[0]!.usd = 0;
  assert.equal(CreatorAnalysis.safeParse(v).success, false);
});
test('scan input rejects account claims, credential URLs, unsupported hosts/platforms and unbounded requests', () => {
  const base = creatorAnalysisFixture().scan.request;
  for (const supplied_url of ['https://evil.test/@x', 'https://www.tiktok.com.evil.test/@x',
    'https://secret@www.tiktok.com/@x', 'http://www.tiktok.com/@x', 'https://www.tiktok.com/@x?token=secret',
    'https://www.tiktok.com/@x/video/12']) assert.equal(ProfileScanRequest.safeParse({ ...base, supplied_url }).success, false);
  assert.equal(ProfileScanRequest.safeParse({ ...base, account_id: crypto.randomUUID() }).success, false);
  assert.equal(ProfileScanRequest.safeParse({ ...base, platform: 'instagram' }).success, false);
  assert.equal(ProfileScanRequest.safeParse({ ...base, max_pages: 4 }).success, false);
});
test('corrections accept text only with version/request IDs, never caller evidence or duplicate targets', () => {
  const v = creatorAnalysisFixture(); const input = { dna_id: v.dna.id, expected_version: 1,
    request_id: crypto.randomUUID(), corrections: [{ claim_id: v.dna.claims[0]!.id, statement: 'I focus on desk lighting.' }] };
  CorrectCreatorDnaInput.parse(input);
  assert.equal(CorrectCreatorDnaInput.safeParse({ ...input, expected_version: 0 }).success, false);
  assert.equal(CorrectCreatorDnaInput.safeParse({ ...input, request_id: undefined }).success, false);
  assert.equal(CorrectCreatorDnaInput.safeParse({ ...input, corrections: [...input.corrections, ...input.corrections] }).success, false);
  assert.equal(CorrectCreatorDnaInput.safeParse({ ...input, evidence: [] }).success, false);
  v.dna.claims[0]!.basis = 'inferred'; v.dna.claims[0]!.dimension = 'audience';
  assert.equal(CreatorAnalysis.parse(v).dna.claims[0]!.basis, 'inferred');
});

test('coverage rejects false completion, fabricated date coverage and unresolved errors', () => {
  reject(v => { v.scan.coverage.pages_received = 0; v.scan.coverage.pages = []; v.scan.coverage.stop_reason = 'limit'; });
  reject(v => { v.scan.coverage.oldest_published_at = null; });
  reject(v => { v.scan.coverage.errors.push({ code: 'timeout', retryable: false, attempt_id: crypto.randomUUID() }); });
  reject(v => { v.scan.coverage.pagination = 'unknown'; });
});
test('image evidence needs media-analysis permission, and corrected text retains user attribution', () => {
  reject(v => { v.scan.video_observations[0]!.provenance.modalities.push('image'); v.dna.claims[0]!.evidence[0]!.modality = 'image'; });
  const v = creatorAnalysisFixture(); const c = v.dna.claims[0]!;
  c.basis = 'user_corrected'; c.supersedes_claim_id = c.id; c.id = crypto.randomUUID();
  c.statement = 'User correction: lighting demonstrations.';
  assert.equal(CreatorAnalysis.parse(v).dna.claims[0]!.basis, 'user_corrected');
});
