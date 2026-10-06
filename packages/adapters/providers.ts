import type { z } from 'zod';
import type { Brief } from '../contracts/index.ts';
import { ProviderResultDraft, ScriptDraft } from '../contracts/drafts.ts';

export interface ReferenceProvider {
  search(brief: z.infer<typeof Brief>): Promise<z.infer<typeof ProviderResultDraft>>;
}
export interface GenerationProvider {
  generate(input: { project_id: string; brief_version: number; brief: z.infer<typeof Brief> }): Promise<z.infer<typeof ScriptDraft>>;
}
/** Intentionally empty fixture: description-only work must not invent references. */
export const noReferenceFixture: ReferenceProvider = {
  async search() {
    return ProviderResultDraft.parse({
      status: 'no_match', references: [], limitations: ['Synthetic fixture; no live provider was queried.'],
      provenance: 'fixture', latency_ms: 0, cost_usd: 0, cost_is_estimate: false,
    });
  },
};
