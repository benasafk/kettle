import { z } from 'zod';
import { Id, Timestamp, result } from './index.ts';
import { CreatorAnalysis, CreatorDnaSnapshot, CreatorIdentity, CreatorUrl, CorrectCreatorDnaInput, ProfileScanResult, LightreelSeedReview } from './creator-profile.ts';

export const GetCreatorDnaInput = z.strictObject({ dna_id: Id, version: z.number().int().positive().max(2147483646).optional() });
/** Server ingestion only. Never accept this shape from a public tool. */
export const IngestCreatorAnalysisInput = z.strictObject({
  project_id: Id, request_id: Id, analysis: CreatorAnalysis,
}).refine(v => v.analysis.dna.version === 1 && v.analysis.dna.claims.every(c => c.basis !== 'user_corrected'), 'Ingestion creates an initial analysis, not a correction');
export const StoredCreatorAnalysis = z.strictObject({ dna_id: Id, project_id: Id, analysis: CreatorAnalysis });
export const StoredCreatorOutput = result(StoredCreatorAnalysis);

// Explicit allowlist. Raw captions/bios, provider endpoints, permission notes, cursors,
// error bodies, attempt accounting and account IDs never reach model/card results.
export const CreatorEvidenceView = z.strictObject({
  observation_id: Id, url: CreatorUrl, retrieved_at: Timestamp, source_observed_at: Timestamp.nullable(),
  origin: z.enum(['fixture', 'live']), published_at: Timestamp.nullable(),
  metrics: z.strictObject({ views: z.number().int().nonnegative().nullable(), likes: z.number().int().nonnegative().nullable(),
    comments: z.number().int().nonnegative().nullable(), shares: z.number().int().nonnegative().nullable() }).nullable(),
});
export const CreatorDnaView = z.strictObject({
  dna_id: Id, project_id: Id, snapshot_id: Id, profile: CreatorIdentity,
  version: z.number().int().positive(), created_at: Timestamp,
  source_scan_id: Id, scan_status: ProfileScanResult.shape.status,
  coverage: ProfileScanResult.shape.coverage.pick({ unique_videos: true, oldest_published_at: true, newest_published_at: true }),
  contains_fixture_data: z.boolean(),
  requested_videos: z.number().int().positive(), coverage_limited: z.boolean(),
  claims: CreatorDnaSnapshot.shape.claims,
  seed_review: z.strictObject({url:LightreelSeedReview.shape.url,provider:LightreelSeedReview.shape.provider,
    summary:LightreelSeedReview.shape.summary,access_basis:LightreelSeedReview.shape.access_basis,
    limitations:LightreelSeedReview.shape.limitations,retrieved_at:Timestamp,origin:z.enum(['fixture','live'])}).optional(),
  evidence: z.array(CreatorEvidenceView).max(170),
  withheld_claim_count: z.number().int().nonnegative(),
  limitations: z.array(z.string().max(1000)).max(61),
});
export const GetCreatorDnaOutput = result(z.strictObject({ dna: CreatorDnaView }));
export const CorrectCreatorDnaOutput = result(z.strictObject({ dna: CreatorDnaView, request_id: Id }));
export const creatorContracts = {
  get_creator_dna: { input: GetCreatorDnaInput, output: GetCreatorDnaOutput, scope: 'projects:read', readOnly: true },
  correct_creator_dna: { input: CorrectCreatorDnaInput.refine(v => v.expected_version < 2147483646, 'Version exceeds storage limit'), output: CorrectCreatorDnaOutput, scope: 'projects:write', readOnly: false },
} as const;
export type CreatorOperation = keyof typeof creatorContracts;
export type StoredCreatorAnalysis = z.infer<typeof StoredCreatorAnalysis>;
export type CreatorDnaView = z.infer<typeof CreatorDnaView>;
