/** Canonicalize without resolving short links or making a TikTok request. */
export function parseTikTokUrl(value: string) {
  const u = new URL(value);
  if (value.length > 2048 || u.protocol !== 'https:' || u.port || u.username || u.password ||
      !['www.tiktok.com', 'tiktok.com'].includes(u.hostname)) throw new Error('Invalid TikTok URL');
  const match = /^\/@([\w.]{1,100})(?:\/video\/(\d{1,30}))?\/?$/.exec(u.pathname);
  if (!match) throw new Error('Expected a TikTok profile or video URL');
  const handle = match[1]!;
  const profileUrl = `https://www.tiktok.com/@${handle}`;
  return { handle, profileUrl, videoId: match[2] ?? null,
    canonicalUrl: match[2] ? `${profileUrl}/video/${match[2]}` : profileUrl };
}
