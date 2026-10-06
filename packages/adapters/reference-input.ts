import { HttpUrl } from '../contracts/index.ts';
import { ReferenceMaterial } from './generation.ts';

/** A user link records intent, never permission or evidence that a URL was fetched. */
export function evaluateReferenceLink(url: string, suppliedMaterial?: unknown) {
  const validatedUrl = HttpUrl.parse(url);
  if (!suppliedMaterial) return {
    status: 'needs_content' as const, url: validatedUrl, fetched: false,
    message: 'This link has not been fetched. Supply permitted text or describe the format; description-only generation remains available.',
  };
  const material = ReferenceMaterial.parse(suppliedMaterial);
  if (material.reference.url !== validatedUrl) throw new Error('Reference URL mismatch');
  if (material.reference.permitted_use === 'needs_review') return {
    status: 'needs_permission' as const, url: validatedUrl, fetched: false,
    message: 'Storage, display, caching and model-processing rights have not been established.',
  };
  return { status: material.reference.permitted_use === 'fixture_only' ? 'fixture_ready' as const : 'approved_content' as const,
    url: validatedUrl, fetched: false, material };
}
