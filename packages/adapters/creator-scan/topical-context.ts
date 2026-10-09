import type { DnaClaim, ProfileObservation, VideoObservation } from '../../contracts/creator-profile.ts';

/** Source attribution only: no keyword classification, audience inference or media claim. */
export function topicalContextFallback(profiles: readonly ProfileObservation[], videos: readonly VideoObservation[],
  newId: () => string): DnaClaim | null {
  const permitted = (o: ProfileObservation | VideoObservation) => o.provenance.permission.status === 'approved' &&
    o.provenance.permission.permitted_uses.includes('display') &&
    o.provenance.permission.permitted_uses.includes('model_processing');
  const newest = <T extends ProfileObservation | VideoObservation>(rows: readonly T[]) => [...rows].sort((a, b) =>
    Date.parse(b.provenance.source_observed_at ?? b.provenance.retrieved_at) -
    Date.parse(a.provenance.source_observed_at ?? a.provenance.retrieved_at) || a.id.localeCompare(b.id));
  const claim = (o: ProfileObservation | VideoObservation, raw: string, source: 'bio' | 'caption'): DnaClaim | null => {
    // Exclude links/handles and normalize controls/spacing. Text stays inert, attributed source data.
    const words = raw.replace(/[\p{Cc}\p{Cf}]/gu, ' ').split(/\s+/u)
      .filter(w => w && !/^(?:https?:\/\/|www\.|@)/i.test(w));
    const selected: string[] = [];
    for (const word of words) {
      if (selected.length === 16 || [...[...selected, word].join(' ')].length > 160) break;
      selected.push(word);
    }
    const excerpt = selected.join(' ');
    if ((excerpt.match(/\p{L}+/gu) ?? []).length < 2) return null;
    return { id: newId(), dimension: 'topics', basis: 'observed',
      statement: `Attributed ${source} excerpt for topic context: ${JSON.stringify(excerpt)}`,
      evidence: [{ observation_id: o.id, modality: source === 'bio' ? 'metadata' : 'caption',
        start_seconds: null, end_seconds: null }], requires_video: false,
      method: 'Bounded source attribution only: at most 16 words/160 characters; links/handles omitted and whitespace normalized.',
      uncertainty: source === 'bio'
        ? 'Creator self-description only, not a verified niche or content classification. Excerpt may omit context; correct this claim to state your topic. Audience and media behavior remain unknown.'
        : 'One caption excerpt only, not a verified niche or representative profile topic. Excerpt may omit context; correct this claim to state your topic. Audience and media behavior remain unknown.',
      supersedes_claim_id: null };
  };
  // Do not fall back to a stale profile bio when the latest observation is blank or restricted.
  const profile = newest(profiles)[0];
  if (profile && permitted(profile) && profile.provenance.modalities.includes('metadata') && profile.bio) {
    const result = claim(profile, profile.bio, 'bio');
    if (result) return result;
  }
  for (const video of newest(videos)) {
    if (!permitted(video) || !video.provenance.modalities.includes('caption') || !video.caption) continue;
    const result = claim(video, video.caption, 'caption');
    if (result) return result;
  }
  return null;
}

/** Match recommendations against the excerpt, never the attribution wrapper. Corrections use their replacement text. */
export function topicalMatchingText(claim: DnaClaim): string {
  const match = claim.basis === 'observed' && /^Attributed (?:bio|caption) excerpt for topic context: (".*")$/.exec(claim.statement);
  if (match) { try { const text: unknown = JSON.parse(match[1]!); if (typeof text === 'string') return text; } catch {} }
  return claim.statement;
}
