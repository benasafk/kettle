/** Editorial review of authored fixtures, not automatic grading or model evidence. */
import { createHash } from 'node:crypto';
import type { EvalCase } from './fixtures.ts';
import type { Script } from '../packages/adapters/generation.ts';

type Ratings = { relevance: number; opening: number; clarity: number; filmability: number; freshness: number };
const entries: Record<string, { sha256: string; ratings: Ratings; notes: string[] }> = {
  'B01-description': {
    sha256: '05a7cb20f04e3b9fcd3f9018a9b7c49b3f4de9ed5217f8b891b702e9155dd8fb',
    ratings: { relevance: 5, opening: 3, clarity: 5, filmability: 5, freshness: 2 },
    notes: ['Supplied settings are demonstrated without battery-life claims.', 'Lock exposure to make the comparison meaningful; the opening is generic.'],
  },
  'B01-reference': {
    sha256: '78bc92480cfabfadc96f85fdc243e87f536e384f4df711a26e99becf1d8e7636',
    ratings: { relevance: 5, opening: 3, clarity: 5, filmability: 5, freshness: 3 },
    notes: ['The original fictional format changes staging without supplying product facts.', 'An empty-desk reveal adds variety, not evidence of paid-reference value.'],
  },
  'B02-silent': {
    sha256: '3dc272f81a131b12cdba9060f01a007523d361e638b3ada7ebec93d42481e763',
    ratings: { relevance: 5, opening: 3, clarity: 5, filmability: 5, freshness: 2 },
    notes: ['Every spoken field is empty and shots keep faces out of frame.', 'No durability or sustainability claims; familiar desk-ritual concept.'],
  },
  'B03-product-page-fixture': {
    sha256: '218abc363c059a84aeaef0be265f5d2172c3de2888b6bbfdc6f33bb87de30512',
    ratings: { relevance: 5, opening: 3, clarity: 4, filmability: 3, freshness: 2 },
    notes: ['The fictional URL was not fetched; weekly planning and shopping lists are supplied facts.', 'Actual screens must be confirmed before filming; automatic list generation is not claimed.'],
  },
  'B05-old': {
    sha256: 'ad80762dcd55d1b6b73063d40b583d3bf2e0d4c193ee137b8e412435b725ce46',
    ratings: { relevance: 5, opening: 3, clarity: 4, filmability: 4, freshness: 2 },
    notes: ['Two pockets agrees with historical brief version 1 only.', 'This is not current-version output or proof of asynchronous persistence. Confirm objects fit.'],
  },
  'B05-revised': {
    sha256: '8703cff87710fafbda417549332cd29ce6aed0b9a4259716c8f500b8e9874777',
    ratings: { relevance: 5, opening: 3, clarity: 4, filmability: 4, freshness: 2 },
    notes: ['Three pockets agrees with corrected brief version 2.', 'No capacity claim is made; the packing setup still needs physical confirmation.'],
  },
};

export function reviewFixture(fixture: EvalCase, script: Script) {
  const sha256 = createHash('sha256').update(JSON.stringify({ input: fixture.input, idea: fixture.idea, references: fixture.references, script })).digest('hex');
  const entry = entries[fixture.id];
  const current = entry?.sha256 === sha256;
  return {
    evidence: 'agent_editorial_review_of_authored_fixture' as const,
    reviewer: 'Kettle Stage 2 B agent', reviewed_at: current ? '2026-10-06' : null,
    content_sha256: sha256, status: current ? 'reviewed' : 'pending',
    ratings: current ? entry.ratings : null,
    factual_integrity: current ? 'pass' : 'pending', appropriate_reference_use: current ? 'pass' : 'pending',
    notes: current ? entry.notes : ['No matching review for this exact input, idea, reference material and script. Editorial review required.'],
    creator_approval: 'not_observed', duration_evidence: 'estimated_not_filmed',
  };
}
