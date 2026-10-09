/** Original fictional JSON; no copied provider/person content or fetched media. */
export const profileBody = JSON.stringify({ success: true,
  user: { id: '9000000000000000001', uniqueId: 'fictional_kettle_creator',
    signature: 'Fictional desk demonstrations.', privateAccount: false },
  stats: { followerCount: null },
});
export function fictionalVideo(aweme_id = '9000000000000000011') {
  return { aweme_id, author: { uid: '9000000000000000001' },
    desc: 'Authored fixture: show a tidy desk.', create_time: 1791504000,
    statistics: { play_count: 120, digg_count: 0, comment_count: null },
    video: { duration: 12000 },
  };
}
export function fixturePage(items: unknown[], extra: Record<string, unknown> = {}) {
  return JSON.stringify({ success: true, aweme_list: items, has_more: false,
    credits_charged: 1, ...extra });
}
export function fixtureAttempt(body: string, requestedCursor: string | null = null) {
  return { status: 200, body, requestedCursor };
}
