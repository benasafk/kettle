/** DRAFT v0.1: evaluation seams only. Not registered MCP tools or persisted records.
 * Lead review is required before turning these into a public/stored contract. */
import { z } from 'zod';
import { Id, Timestamp, HttpUrl, OperationError } from './index.ts';

export const JobDraft = z.strictObject({
  id: Id, account_id: Id, project_id: Id, brief_version: z.number().int().positive(),
  request_id: Id, state: z.enum(['queued', 'running', 'succeeded', 'failed', 'cancelled']),
  step: z.enum(['pending_dispatch', 'searching', 'ranking', 'drafting', 'checking', 'complete']),
  attempts: z.number().int().nonnegative(), cancel_requested_at: Timestamp.nullable(),
  result_id: Id.nullable(), error: OperationError.nullable(),
});
export const ReferenceDraft = z.strictObject({
  id: z.string().min(1).max(200), provider: z.string().min(1).max(100),
  url: HttpUrl, observed_at: Timestamp,
  permitted_use: z.enum(['fixture_only', 'needs_review', 'approved']),
  permission_basis: z.string().min(1).max(2000),
});
export const ScriptDraft = z.strictObject({
  origin: z.enum(['fixture', 'generated']), project_id: Id, brief_version: z.number().int().positive(),
  language: z.string().min(1).max(35),
  estimated_duration_seconds: z.number().positive().max(180),
  sections: z.array(z.strictObject({
    spoken: z.string().max(4000), shot: z.string().min(1).max(2000),
    on_screen_text: z.string().max(500), fact_ids: z.array(Id).max(50),
  })).min(1).max(30),
  reference_ids: z.array(z.string().min(1).max(200)).max(8),
  limitations: z.array(z.string().min(1).max(1000)).max(20),
});
export const ProviderResultDraft = z.strictObject({
  status: z.enum(['matched', 'no_match']), references: z.array(ReferenceDraft).max(8),
  limitations: z.array(z.string().max(1000)).max(20),
  provenance: z.enum(['fixture', 'live']), latency_ms: z.number().nonnegative(),
  cost_usd: z.number().nonnegative().nullable(), cost_is_estimate: z.boolean(),
}).refine((r) => r.status === 'matched' ? r.references.length > 0 : r.references.length === 0);
