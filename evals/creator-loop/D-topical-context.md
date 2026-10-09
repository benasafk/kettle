# Grounded topical-context fallback

Based on merged main `4666e57`. This owned adapter follow-up addresses the case where
none of the original desk/travel/golf/cooking keywords produces a topic claim. It
adds no classifier category, shared schema, external request or runtime change.

The DNA builder emits at most one additional observed `topics` claim, only when no
existing topical claim exists. It prefers the latest source-dated profile bio, then
a permitted caption. Live source status must be `approved`, with both `display` and
`model_processing` uses and the relevant metadata/caption modality. Restricted,
blank or link-only sources do not produce substitute facts. A newer blank/restricted
profile observation does not resurrect an older bio.

The claim explicitly attributes an excerpt rather than naming a niche. The excerpt
is bounded to 16 whitespace-delimited words and 160 Unicode code points; links and
handles are omitted, controls/spacing normalized. This is not a summary or semantic
classification. Supporting observation ID/modality are retained; `requires_video`
is false. Uncertainty distinguishes self-description from a single caption, warns
of omitted context, and asks the creator to correct the topic. No audience or media
claim is inferred from this fallback.

The existing correction input/envelope can target the new claim, and the permitted
claim survives `CreatorDnaView` filtering. Recommendation matching uses only excerpt
text, avoiding false matches from the attribution wrapper. Corrected claims use
replacement text. It can supply relevant vocabulary to existing discovery/lexical
matching, but no semantic relevance or performance validation is claimed. The
analyzer version advances to `deterministic-caption-metadata-v2`.

Authored tests use astronomy/telescope text, not fetched @smartykalz data. They cover
bio/caption fallback, no invented categorization, correction lineage, source rights,
modality, fresh-versus-cached observations, Unicode/quote bounds, inert instructions,
empty sources, existing-topic suppression, and useful downstream context without
boilerplate-only recommendations. No provider calls or spending.

Reproduce:

```sh
node --import tsx --test tests/creator-topical-context.test.ts tests/creator-scan-normalization.test.ts tests/creator-pipeline-provider.test.ts
npm run typecheck
```
