/** Authored fictional data. No fetched content; never a production fallback. */
import { CreatorAnalysis, type ProfileScanResult } from '../creator-profile.ts';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const at = '2026-10-09T12:00:00Z';
export function creatorAnalysisFixture(): CreatorAnalysis {
  const profile = { platform: 'tiktok' as const, native_id: 'fictional-creator-1' };
  const url = 'https://www.tiktok.com/@fictional_kettle_creator';
  const provenance = { provider: 'authored-fixture', endpoint: 'fixture/profile', origin: 'fixture' as const,
    retrieved_at: at, source_observed_at: null, source_url: url,
    permission: { status: 'fixture_only' as const, basis: 'Authored fictional test content',
      permitted_uses: ['store', 'display', 'model_processing'] as const, retention: 'Fictional fixture; no real person data' },
    modalities: ['metadata', 'caption'] as const };
  return CreatorAnalysis.parse({ scan: {
    id: id(1), request: { platform: 'tiktok', supplied_url: url, max_pages: 1, max_videos: 10 },
    created_at: at, status: 'complete', profile,
    profile_observations: [{ id: id(2), profile, canonical_url: url, handle: 'fictional_kettle_creator',
      display_name: 'Fictional desk creator', bio: 'Fictional desk demonstrations', follower_count: null, provenance }],
    video_observations: [{ id: id(3), video: { platform: 'tiktok', native_id: 'fictional-video-1' }, creator: profile,
      canonical_url: `${url}/video/9000000000000000011`, caption: 'Authored fixture: tidy desk demonstration',
      published_at: at, duration_seconds: 12, metrics: { views: 120, likes: 0, comments: null, shares: null }, provenance }],
    coverage: { pages_received: 1, unique_videos: 1, rejected_items: 0, pagination: 'exhausted',
      stop_reason: 'exhausted', omissions: [], oldest_published_at: at, newest_published_at: at,
      pages: [{ requested_cursor: null, returned_cursor: null, received_items: 1, admitted_observations: 1 }], errors: [] },
    limitations: ['A fictional bounded sample; no real profile was scanned.'],
    cost: { attempts: [], latency_ms: 0 },
  }, dna: { id: id(4), profile, version: 1, created_at: at, source_scan_id: id(1),
    analyzer_version: 'authored-fixture-v1', taxonomy_version: 'creator-dna-v1',
    claims: [{ id: id(5), dimension: 'topics', statement: 'Desk demonstrations appear in the supplied caption.',
      basis: 'observed', evidence: [{ observation_id: id(3), modality: 'caption', start_seconds: null, end_seconds: null }],
      requires_video: false, method: 'Authored caption observation', uncertainty: 'One caption does not establish a recurring pattern.',
      supersedes_claim_id: null }], limitations: ['Audience and visual pacing are unknown.'] } });
}
export function partialScanFixture(): ProfileScanResult {
  const scan = creatorAnalysisFixture().scan;
  return { ...scan, status: 'partial', coverage: { ...scan.coverage, pagination: 'unknown', stop_reason: 'unknown' },
    limitations: ['Provider pagination coverage is unknown.'] };
}
export function unavailableScanFixture(): ProfileScanResult {
  const scan = creatorAnalysisFixture().scan;
  return { ...scan, status: 'unavailable', profile: null, profile_observations: [], video_observations: [],
    coverage: { pages_received: 0, unique_videos: 0, rejected_items: 0, pagination: 'unknown', stop_reason: 'inaccessible', omissions: [], oldest_published_at: null, newest_published_at: null, pages: [], errors: [] },
    limitations: ['Profile could not be resolved.'] };
}
