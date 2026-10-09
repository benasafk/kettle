import { creatorAnalysisFixture } from '../../packages/contracts/fixtures/creator-profile.ts';
import { normalizeMockTikTokScan } from '../../packages/adapters/creator-scan/normalize.ts';
import { buildGroundedCreatorDna } from '../../packages/adapters/creator-scan/dna.ts';

/** Reuse D0's authored fixture as source values, then encode the provider dialect.
 * Numeric IDs are fictional replacements because TikTok provider IDs are decimal.
 */
export function normalizedFixtureInput() {
  const shared = creatorAnalysisFixture().scan;
  const p = shared.profile_observations[0]!;
  const v = shared.video_observations[0]!;
  const authorId = '9000000000000000001';
  const videoId = '9000000000000000011';
  return { id: shared.id, created_at: shared.created_at, request: { ...shared.request, max_pages: 2 }, latency_ms: 0,
    profileAttempt: { id: '00000000-0000-4000-8000-000000000101', status: 200,
      retrieved_at: p.provenance.retrieved_at, source_observed_at: null,
      body: JSON.stringify({ success: true, credits_charged: 1,
        user: { id: authorId, uniqueId: p.handle, nickname: p.display_name, signature: p.bio },
        stats: { followerCount: p.follower_count } }) },
    feedAttempts: [{ id: '00000000-0000-4000-8000-000000000102', status: 200 as number | null,
      retrieved_at: v.provenance.retrieved_at, source_observed_at: null as string | null, requestedCursor: null as string | null,
      body: JSON.stringify({ success: true, credits_charged: 1, has_more: false,
        aweme_list: [{ aweme_id: videoId, author: { uid: authorId }, desc: v.caption,
          create_time: Date.parse(v.published_at!) / 1000, video: { duration: v.duration_seconds! * 1000 },
          statistics: { play_count: v.metrics.views, digg_count: v.metrics.likes,
            comment_count: v.metrics.comments, share_count: v.metrics.shares } }] }) }],
  };
}

export function normalizedAnalysisFixture() {
  let next = 200;
  const newId = () => `00000000-0000-4000-8000-${String(next++).padStart(12, '0')}`;
  const input = normalizedFixtureInput();
  const scan = normalizeMockTikTokScan(input, newId);
  return buildGroundedCreatorDna(scan, { id: newId(), created_at: input.created_at }, newId);
}
