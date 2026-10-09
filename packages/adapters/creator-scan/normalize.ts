/** Offline authored-response adapter. No network, public tool or live authorization. */
import { ProfileScanRequest, ProfileScanResult, type ObservationProvenance,
  type ScanCostEvidence, type ScanCoverage } from '../../contracts/creator-profile.ts';
import { characterizeFeed, characterizeProfile } from './scrapecreators-characterization.ts';

// Transport evidence supplied by the mock harness, never read from provider JSON.
type MockAttempt = { id: string; status: number | null; body: string;
  retrieved_at: string; source_observed_at: string | null };

export function normalizeMockTikTokScan(input: {
  id: string; created_at: string; request: ProfileScanRequest;
  profileAttempt: MockAttempt;
  feedAttempts: readonly (MockAttempt & { requestedCursor: string | null })[];
  latency_ms: number;
}, newId: () => string = () => crypto.randomUUID()): ProfileScanResult {
  const request = ProfileScanRequest.parse(input.request);
  const profileAttempt = input.profileAttempt;
  const profile = profileAttempt.status === 200 ? characterizeProfile(profileAttempt.body) : null;
  const attempts: ScanCostEvidence['attempts'] = [];
  const errors: ScanCoverage['errors'] = [];
  const cost = (attempt: MockAttempt, succeeded: boolean, credits: number | null) => {
    attempts.push({ id: attempt.id, provider: 'scrapecreators',
      outcome: attempt.status === null ? 'ambiguous' : succeeded ? 'succeeded' : 'failed',
      credits, usd: null, usd_basis: 'unknown', conversion_basis: null });
  };
  const failureCode = (status: number | null): ScanCoverage['errors'][number]['code'] =>
    status === null ? 'timeout' : status === 404 ? 'not_found' : status === 403 ? 'private' :
      status === 429 ? 'rate_limited' : status === 200 ? 'malformed' : 'provider_failure';
  cost(profileAttempt, profile !== null && profile.kind !== 'malformed',
    profile && profile.kind !== 'malformed' ? profile.credits : null);
  const base = {
    id: input.id, request, created_at: input.created_at,
    cost: { attempts, latency_ms: input.latency_ms },
  };
  const profileHandleMatches = profile && profile.kind !== 'malformed' &&
    profile.user.uniqueId.toLowerCase() === new URL(request.supplied_url).pathname.replace(/^\/@|\/$/g, '').toLowerCase();
  if (!profile || profile.kind !== 'available' || !profileHandleMatches) {
    const unavailable = profile?.kind === 'private' || [403, 404].includes(profileAttempt.status ?? 0);
    errors.push({ code: profile?.kind === 'private' ? 'private' : failureCode(profileAttempt.status),
      attempt_id: profileAttempt.id, retryable: false });
    return ProfileScanResult.parse({ ...base, status: unavailable ? 'unavailable' : 'failed',
      profile: null, profile_observations: [], video_observations: [],
      coverage: { pages_received: 0, unique_videos: 0, rejected_items: 0,
        pagination: 'unknown', stop_reason: unavailable ? 'inaccessible' : 'error',
        omissions: [], oldest_published_at: null, newest_published_at: null, pages: [], errors },
      limitations: ['Mock profile is inaccessible, malformed, or does not match the requested handle. No feed was admitted.'],
    });
  }
  const identity = { platform: 'tiktok' as const, native_id: profile.user.id };
  const url = `https://www.tiktok.com/@${profile.user.uniqueId}`;
  const provenance = (attempt: MockAttempt, endpoint: string, source_url: string,
    caption: boolean): ObservationProvenance => ({
    provider: 'scrapecreators', endpoint, origin: 'fixture', retrieved_at: attempt.retrieved_at,
    source_observed_at: attempt.source_observed_at, source_url,
    permission: { status: 'fixture_only', basis: 'Authored fictional provider-response replay; not permission for real content.',
      permitted_uses: ['store', 'display', 'model_processing'], retention: 'Fictional test fixture only.' },
    modalities: caption ? ['metadata', 'caption'] : ['metadata'],
  });
  const replay = characterizeFeed({ profileBody: profileAttempt.body, attempts: input.feedAttempts,
    maxPages: request.max_pages, maxVideos: request.max_videos });
  for (let i = 0; i < replay.attempts; i++) {
    const attempt = input.feedAttempts[i]!;
    const succeeded = i < replay.pages.length;
    cost(attempt, succeeded, replay.credits[i] ?? null);
    if (!succeeded) errors.push({ code: failureCode(attempt.status), attempt_id: attempt.id, retryable: false });
  }
  const videos = replay.observations.map(({ attempt, item }) => {
    const source = input.feedAttempts[attempt - 1]!;
    const canonical_url = `${url}/video/${item.aweme_id}`;
    return { id: newId(), video: { platform: 'tiktok' as const, native_id: item.aweme_id },
      creator: identity, canonical_url, caption: item.desc,
      published_at: item.create_time === null ? null : new Date(item.create_time * 1000).toISOString(),
      duration_seconds: item.video?.duration ? item.video.duration / 1000 : null,
      metrics: { views: item.statistics?.play_count ?? null, likes: item.statistics?.digg_count ?? null,
        comments: item.statistics?.comment_count ?? null, shares: item.statistics?.share_count ?? null },
      provenance: provenance(source, '/v3/tiktok/profile/videos', canonical_url, item.desc !== null),
    };
  });
  const dates = videos.flatMap(v => v.published_at === null ? [] : [v.published_at]).sort();
  const stoppedWithError = errors.length > 0;
  const lastPage = replay.pages.at(-1);
  const stop_reason: ScanCoverage['stop_reason'] = stoppedWithError ? 'error' :
    replay.stop === 'feed_exhausted' ? 'exhausted' :
      ['page_limit', 'video_limit', 'observation_limit'].includes(replay.stop) ? 'limit' : 'unknown';
  // Provider feed coverage is known to be incomplete even when pagination ends.
  return ProfileScanResult.parse({ ...base, status: 'partial', profile: identity,
    profile_observations: [{ id: newId(), profile: identity, canonical_url: url,
      handle: profile.user.uniqueId, display_name: profile.user.nickname ?? null,
      bio: profile.user.signature, follower_count: profile.followerCount,
      provenance: provenance(profileAttempt, '/v1/tiktok/profile', url, false) }],
    video_observations: videos,
    coverage: { pages_received: replay.pages.length, unique_videos: replay.uniqueIds.length,
      rejected_items: replay.rejected,
      pagination: lastPage?.has_more === false ? 'exhausted' : lastPage?.has_more === true ? 'more' : 'unknown',
      stop_reason, omissions: ['TikTok feeds may omit public posts; this mock sample cannot prove profile completeness.'],
      oldest_published_at: dates[0] ?? null, newest_published_at: dates.at(-1) ?? null,
      pages: replay.pages.map(({ has_more: _hasMore, ...p }) => p), errors },
    limitations: [
      'Authored mocked responses only; no real profile, audience or visual content analyzed.',
      `Replay stopped: ${replay.stop}. Rejected rows: ${replay.rejected}. Duplicate observations retained: ${replay.duplicates}.`,
      'Provider credits are recorded when supplied; dollar costs remain unknown. Duration zero is unavailable, not a valid video duration.',
    ],
  });
}
