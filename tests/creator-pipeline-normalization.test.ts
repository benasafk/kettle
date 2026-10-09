import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizedFixtureInput } from '../evals/creator-loop/normalized-fixture.ts';
import { normalizeLiveTikTokScan } from '../packages/adapters/creator-pipeline/live-scan.ts';
import { readTikTokDetail } from '../packages/adapters/creator-pipeline/detail-json.ts';
import { readLightreelSubmission, readLightreelHistory } from '../packages/adapters/creator-pipeline/lightreel-json.ts';
import { CreatorAnalysis, ProfileScanResult, type ObservationProvenance } from '../packages/contracts/creator-profile.ts';
import { buildGroundedCreatorDna } from '../packages/adapters/creator-scan/dna.ts';
import { fictionalVideo } from '../evals/creator-loop/fixtures.ts';
const permission: ObservationProvenance['permission'] = { status: 'approved',
  basis: 'Synthetic test of trusted server permission; not real authorization.',
  permitted_uses: ['store', 'display', 'model_processing'], retention: 'Test process only' };
function input() {
  const fixture = normalizedFixtureInput();
  return { ...fixture, permission,
    profileAttempt: { ...fixture.profileAttempt, failure: null, latency_ms: 0 },
    feedAttempts: fixture.feedAttempts.map(a => ({ ...a, failure: null, latency_ms: 0 })),
  };
}
test('live mapper validates shared envelope and cannot inherit provider-supplied permissions or provenance', () => {
  const i = input();
  const raw = JSON.parse(i.profileAttempt.body);
  raw.provenance = { origin: 'fixture', permission: { status: 'approved', permitted_uses: ['media_analysis'] } };
  i.profileAttempt.body = JSON.stringify(raw);
  const scan = ProfileScanResult.parse(normalizeLiveTikTokScan(i));
  assert.equal(scan.profile_observations[0]!.provenance.origin, 'live');
  assert.deepEqual(scan.profile_observations[0]!.provenance.permission, permission);
  assert.equal(scan.cost.attempts[0]!.usd, null);
  const analysis = buildGroundedCreatorDna(scan, { id: crypto.randomUUID(), created_at: scan.created_at });
  CreatorAnalysis.parse(analysis);
  assert.ok(analysis.dna.claims.every(c => !c.requires_video && c.dimension !== 'pacing'));
  assert.ok(analysis.dna.claims.filter(c => c.dimension === 'audience').every(c => c.basis === 'inferred'));
});
test('live mapping requires server approval and preserves dated duplicates, null metrics and zero', () => {
  const i = input();
  assert.throws(() => normalizeLiveTikTokScan({ ...i, permission: { ...permission, status: 'fixture_only' } }));
  assert.throws(() => normalizeLiveTikTokScan({ ...i, permission: { ...permission, permitted_uses: [] } }));
  const first = JSON.parse(i.feedAttempts[0]!.body);
  first.has_more = true; first.max_cursor = '10';
  first.aweme_list[0].statistics = { play_count: null, digg_count: 0 };
  i.feedAttempts[0]!.body = JSON.stringify(first);
  i.feedAttempts.push({ ...i.feedAttempts[0]!, id: crypto.randomUUID(), requestedCursor: '10',
    source_observed_at: '2026-10-08T00:00:00Z',
    body: JSON.stringify({ ...first, has_more: false,
      aweme_list: [{ ...first.aweme_list[0], statistics: { play_count: 99 } }] }) });
  const scan = normalizeLiveTikTokScan(i);
  assert.equal(scan.video_observations.length, 2); assert.equal(scan.coverage.unique_videos, 1);
  assert.equal(scan.video_observations[0]!.metrics.views, null);
  assert.equal(scan.video_observations[0]!.metrics.likes, 0);
  assert.equal(scan.video_observations[1]!.provenance.source_observed_at, '2026-10-08T00:00:00Z');
  assert.equal(scan.status, 'partial');
});
test('Lightreel parsing requires identity and bounds canonical deduplicated candidates to three', () => {
  const urls = ['https://evil.test/a', 'https://www.tiktok.com/@a/video/1?x=1',
    'https://www.tiktok.com/@b/video/1', ...[2, 3, 4].map(id => `https://www.tiktok.com/@a/video/${id}`)];
  const result = readLightreelSubmission(JSON.stringify({ conversationId: 'chat-1', answer: { urls } }));
  assert.equal(result.urls?.length, 3); assert.equal(result.urls![0], 'https://www.tiktok.com/@a/video/1');
  assert.throws(() => readLightreelSubmission(JSON.stringify({ answer: { urls } })));
  assert.throws(() => readLightreelHistory(JSON.stringify({ conversationId: 'other', messages: [] }), 'chat-1'));
  assert.equal(readLightreelHistory(JSON.stringify({ conversationId: 'chat-1', messages: [] }), 'chat-1').urls, null);
  assert.deepEqual(readLightreelSubmission(JSON.stringify({ conversationId: 'chat-1', answer: { urls: [] } })).urls, []);
});
test('v2 enrichment binds native video and handle, never treats a caption as media', () => {
  const video = fictionalVideo();
  const url = `https://www.tiktok.com/@fictional_kettle_creator/video/${video.aweme_id}`;
  const provenance = normalizeLiveTikTokScan(input()).profile_observations[0]!.provenance;
  const body = JSON.stringify({ success: true, aweme_detail: { ...video,
    author: { ...video.author, unique_id: 'fictional_kettle_creator' },
    provenance: { modalities: ['video'] } } });
  const result = readTikTokDetail(body, url, crypto.randomUUID(), provenance);
  assert.equal(result.credits, null); assert.equal(result.observation.metrics.likes, 0);
  assert.equal(result.observation.metrics.shares, null);
  assert.equal(result.observation.duration_seconds, 12);
  assert.deepEqual(result.observation.provenance.modalities, ['metadata', 'caption']);
  assert.throws(() => readTikTokDetail(body, url.replace(video.aweme_id, '1'), crypto.randomUUID(), provenance));
});

test('OpenAI parsing rejects refusals, incomplete output and multiple answers without retrying', async () => {
  const { readOpenAiResponse } = await import('../packages/adapters/creator-pipeline/openai-json.ts');
  const complete = { id: 'resp-fixture', status: 'completed', output: [{ type: 'message', role: 'assistant',
    content: [{ type: 'output_text', text: '{"variants":[]}' }] }] };
  assert.deepEqual(readOpenAiResponse(JSON.stringify(complete)).output, { variants: [] });
  assert.equal(readOpenAiResponse(JSON.stringify(complete)).usage, null);
  assert.throws(() => readOpenAiResponse(JSON.stringify({ ...complete, status: 'incomplete' })));
  assert.throws(() => readOpenAiResponse(JSON.stringify({ ...complete, output: [complete.output[0], complete.output[0]] })));
  assert.throws(() => readOpenAiResponse(JSON.stringify({ ...complete,
    output: [{ type: 'message', role: 'assistant', content: [{ type: 'refusal' }] }] })));
});

test('durable receipt sanitizer discards media/account fields and nested smuggling in scalar fields', async () => {
  const { sanitizedScrape } = await import('../packages/adapters/creator-pipeline/sanitize.ts');
  const body = sanitizedScrape(JSON.stringify({ success: true, credits_remaining: 100,
    user: { id: '1', uniqueId: 'fictional', signature: { hidden: 'secret-media-url' }, avatarLarger: 'secret-media-url' },
    stats: { followerCount: null }, arbitrary: 'secret-media-url' }), 'profile');
  assert.ok(!body.includes('secret-media-url')); assert.ok(!body.includes('credits_remaining'));
  assert.deepEqual(JSON.parse(body).user.signature, {});
});
