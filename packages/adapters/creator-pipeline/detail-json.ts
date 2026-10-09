/** @internal Allowlisted ScrapeCreators v2 detail fields. No media URL is retained or fetched. */
import { z } from 'zod';
import { VideoObservation, type ObservationProvenance } from '../../contracts/creator-profile.ts';
import { parseTikTokUrl } from './tiktok-url.ts';
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullish().transform(v => v ?? null);
const detail = z.object({ success: z.literal(true), credits_charged: count,
  aweme_detail: z.object({ aweme_id: z.string().regex(/^\d{1,30}$/),
    author: z.object({ uid: z.string().regex(/^\d{1,30}$/), unique_id: z.string().regex(/^[\w.]{1,100}$/) }),
    desc: z.string().max(10000).nullish(), create_time: count.refine(v => v === null || v <= 253402300799),
    statistics: z.object({ play_count: count, digg_count: count, comment_count: count, share_count: count }).nullish(),
    video: z.object({ duration: count }).nullish(),
  }),
});
export function readTikTokDetail(body: string, requestedUrl: string, id: string,
  provenance: ObservationProvenance) {
  const { aweme_detail: item, credits_charged } = detail.parse(JSON.parse(body));
  const requested = parseTikTokUrl(requestedUrl);
  if (requested.videoId !== item.aweme_id || requested.handle.toLowerCase() !== item.author.unique_id.toLowerCase()) {
    throw new Error('Video identity mismatch');
  }
  const canonical_url = `https://www.tiktok.com/@${item.author.unique_id}/video/${item.aweme_id}`;
  return { credits: credits_charged, observation: VideoObservation.parse({ id,
    video: { platform: 'tiktok', native_id: item.aweme_id },
    creator: { platform: 'tiktok', native_id: item.author.uid }, canonical_url,
    caption: item.desc ?? null,
    published_at: item.create_time === null ? null : new Date(item.create_time * 1000).toISOString(),
    duration_seconds: item.video?.duration ? item.video.duration / 1000 : null,
    metrics: { views: item.statistics?.play_count ?? null, likes: item.statistics?.digg_count ?? null,
      comments: item.statistics?.comment_count ?? null, shares: item.statistics?.share_count ?? null },
    provenance: { ...provenance, source_url: canonical_url,
      modalities: item.desc == null ? ['metadata'] : ['metadata', 'caption'] },
  }) };
}
