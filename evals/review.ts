/** Explicit reviewer decisions are separate from schema checks. This is an evaluation
 * gate, not a production acceptance policy or an automated truth detector. */
export interface FactualReview {
  reviewer: string;
  factual_integrity: 'pass' | 'fail' | 'pending';
  appropriate_reference_use: 'pass' | 'fail' | 'pending';
  reasons: string[];
}
export function passesFactualReview(review: FactualReview): boolean {
  return review.reviewer.trim().length > 0 && review.factual_integrity === 'pass'
    && review.appropriate_reference_use === 'pass';
}
export const unsupportedClaimReview: FactualReview = {
  reviewer: 'Agent review of authored negative fixture', factual_integrity: 'fail', appropriate_reference_use: 'pass',
  reasons: ['The lamp brief supplies rechargeability and three settings only. A 48-hour battery-life claim is unsupported even if it cites an existing fact ID.'],
};
