/** @internal Provider dialect, not a pipeline/domain schema. */
import { z } from 'zod';
import { parseTikTokUrl } from './tiktok-url.ts';
const conversationId = z.string().regex(/^[\w-]{1,200}$/);
const answer = z.object({ urls: z.array(z.string().max(2048)).max(20) });
const submission = z.object({ conversationId, answer: z.unknown().optional() });
const history = z.object({ conversationId,
  messages: z.array(z.object({ role: z.string(), answer: z.unknown().optional() })).max(100) });

export function readLightreelSubmission(body: string) {
  const value = submission.parse(JSON.parse(body));
  return { conversationId: value.conversationId, urls: candidateUrls(value.answer) };
}
export function readLightreelHistory(body: string, expectedId: string) {
  const value = history.parse(JSON.parse(body));
  if (value.conversationId !== expectedId) throw new Error('Research identity mismatch');
  const latest = value.messages.filter(m => m.role === 'assistant').at(-1);
  return { conversationId: value.conversationId, urls: candidateUrls(latest?.answer) };
}
function candidateUrls(raw: unknown): string[] | null {
  if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { return null; } }
  const parsed = answer.safeParse(raw);
  if (!parsed.success) return null;
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const value of parsed.data.urls) {
    try {
      const candidate = parseTikTokUrl(value);
      if (!candidate.videoId || seen.has(candidate.videoId)) continue;
      seen.add(candidate.videoId); urls.push(candidate.canonicalUrl);
      if (urls.length === 3) break;
    } catch { /* Untrusted/non-TikTok/short URLs are not fetched. */ }
  }
  return urls;
}
