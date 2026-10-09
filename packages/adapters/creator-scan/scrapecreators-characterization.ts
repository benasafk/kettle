/** @internal Offline provider characterization only. Not a D0/public scan contract.
 * No transport, credentials, model calls or persistence. Inputs are JSON strings
 * replayed from authored fixtures; this module is not wired into runtime tools.
 */
import { z } from 'zod';

const id = z.string().regex(/^\d{1,30}$/);
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullish()
  .transform(value => value ?? null);
const text = z.string().max(10_000).nullish().transform(value => value ?? null);
const profile = z.object({
  success: z.literal(true),
  user: z.object({ id, uniqueId: z.string().min(1).max(100), signature: text,
    privateAccount: z.boolean().optional() }),
  stats: z.object({ followerCount: count }).nullish(),
});
const video = z.object({
  aweme_id: id,
  author: z.object({ uid: id }),
  desc: text,
  create_time: count,
  statistics: z.object({ play_count: count, digg_count: count,
    comment_count: count, share_count: count }).nullish(),
  // Keep provider units here; D0 normalization owns conversion/validation.
  video: z.object({ duration: count }).nullish(),
});
const cursor = z.union([z.string().regex(/^\d{1,30}$/),
  z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).transform(String)]);
const page = z.object({
  success: z.literal(true), aweme_list: z.array(z.unknown()).max(500),
  has_more: z.union([z.boolean(), z.literal(0), z.literal(1)]).optional(),
  max_cursor: cursor.nullish(), credits_charged: count,
});

function json(body: string): unknown {
  if (new TextEncoder().encode(body).length > 262_144) throw new Error('oversized');
  return JSON.parse(body);
}

/** Allowlisted provider fields only; captions remain inert untrusted strings. */
export function characterizeProfile(body: string) {
  try {
    const parsed = profile.safeParse(json(body));
    if (!parsed.success) return { kind: 'malformed' as const };
    const value = parsed.data;
    return { kind: value.user.privateAccount ? 'private' as const : 'available' as const,
      user: value.user, followerCount: value.stats?.followerCount ?? null };
  } catch { return { kind: 'malformed' as const }; }
}

/** Replay fixed HTTP observations. One attempt/page, no retries on any failure.
 * A transport timeout is represented by null status. The caller cannot cause I/O.
 * Limits bound replay work, not live billing or production orchestration.
 */
export function characterizeFeed(input: {
  profileBody: string;
  attempts: readonly { status: number | null; body: string; requestedCursor: string | null }[];
  maxPages?: number;
  maxVideos?: number;
}) {
  const maxPages = input.maxPages ?? 2;
  const maxVideos = input.maxVideos ?? 10;
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 3 ||
      !Number.isInteger(maxVideos) || maxVideos < 1 || maxVideos > 50) {
    throw new Error('Invalid offline replay limits');
  }
  const parsedProfile = characterizeProfile(input.profileBody);
  const observations: { attempt: number; item: z.infer<typeof video> }[] = [];
  const uniqueIds = new Set<string>();
  const cursors = new Set<string>();
  const credits: (number | null)[] = [];
  let attempts = 0;
  let rejected = 0;
  let duplicates = 0;
  let requestedCursor: string | null = null;
  const finish = (stop: string) => ({ evidence: 'authored_fixture_replay' as const,
    profile: parsedProfile, observations, uniqueIds: [...uniqueIds], attempts,
    rejected, duplicates, credits, nextCursor: requestedCursor, stop,
    // Even an exhausted feed does not establish an exhaustive profile inventory.
    profileComplete: false as const, visualAnalysis: 'not_performed' as const });
  if (parsedProfile.kind !== 'available') return finish(parsedProfile.kind);
  for (const attempt of input.attempts) {
    if (attempts >= maxPages) return finish('page_limit');
    if (attempt.requestedCursor !== requestedCursor) return finish('cursor_mismatch');
    attempts++;
    credits.push(null); // A failed/malformed response does not establish zero cost.
    if (attempt.status === null) return finish('ambiguous_transport_failure');
    if (attempt.status === 401) return finish('unauthenticated');
    if (attempt.status === 403 || attempt.status === 404) return finish('inaccessible');
    if (attempt.status === 429) return finish('rate_limited');
    if (attempt.status !== 200) return finish('provider_failure');
    let result: z.infer<typeof page>;
    try { result = page.parse(json(attempt.body)); }
    catch { return finish('malformed_page'); }
    credits[credits.length - 1] = result.credits_charged;
    for (const raw of result.aweme_list) {
      const parsed = video.safeParse(raw);
      if (!parsed.success || parsed.data.author.uid !== parsedProfile.user.id) {
        rejected++;
        continue;
      }
      const item = parsed.data;
      if (uniqueIds.has(item.aweme_id)) duplicates++;
      else if (uniqueIds.size >= maxVideos) return finish('video_limit');
      uniqueIds.add(item.aweme_id);
      // Retain conflicting metric observations; never last-write-wins deduplication.
      observations.push({ attempt: attempts, item: {
        ...item, statistics: item.statistics ?? {
          play_count: null, digg_count: null, comment_count: null, share_count: null,
        },
      } });
    }
    if (result.has_more === false || result.has_more === 0) return finish('feed_exhausted');
    // Official sample lacks has_more; do not invent an exhausted-feed assertion.
    if (result.has_more === undefined) return finish('pagination_unknown');
    if (result.max_cursor == null || result.max_cursor === '0' || cursors.has(result.max_cursor)) {
      return finish('pagination_stalled');
    }
    cursors.add(result.max_cursor);
    requestedCursor = result.max_cursor;
    if (uniqueIds.size >= maxVideos) return finish('video_limit');
  }
  return finish(attempts >= maxPages ? 'page_limit' : 'replay_ended');
}
