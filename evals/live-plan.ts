import { cases } from './fixtures.ts';

// Engineering evaluation selection, not a production default. Recheck pricing before future use.
export const livePlan = {
  model: 'gpt-4.1-mini-2025-04-14', pricing_checked_at: '2026-10-06',
  pricing_source: 'https://developers.openai.com/api/docs/models/gpt-4.1-mini',
  input_usd_per_million: 0.40, output_usd_per_million: 1.60,
  context_tokens: 1047576, max_output_tokens: 2400,
  // Charge the entire context as uncached input PLUS the output limit. This
  // deliberately overbounds input, schema and instruction tokens without a tokenizer.
  calculated_bound_usd: (1047576 * 0.40 + 2400 * 1.60) / 1e6,
  reservation_usd_per_attempt: 0.50,
  repeats: 2, max_attempts: 1, timeout_ms: 60000,
  service_tier: 'default', tool_calls: 0,
} as const;

export function descriptionOnlyCases() {
  return ['B01-description', 'B02-silent', 'B03-product-page-fixture', 'B05-revised'].map(id => {
    const fixture = cases.find(item => item.id === id)!;
    const input = structuredClone(fixture.input);
    // Reuse the supplied fictional facts as text, without sending a product-page URL.
    input.brief.facts = input.brief.facts.map(fact => ({ ...fact, source: { kind: 'user', captured_at: fact.source.captured_at } }));
    return { id: id === 'B03-product-page-fixture' ? 'B03-description' : id, input, input_provenance: 'authored_fictional_brief' };
  });
}

export function usageCostUpperEstimate(inputTokens: number | null, outputTokens: number | null) {
  if (inputTokens === null || outputTokens === null) return null;
  return (inputTokens * livePlan.input_usd_per_million + outputTokens * livePlan.output_usd_per_million) / 1e6;
}
