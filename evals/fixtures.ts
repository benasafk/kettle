/** Entire file is fictional, authored for regression/evaluation. No provider observations. */
import { Brief } from '../packages/contracts/index.ts';
import { ScriptDraft } from '../packages/contracts/drafts.ts';
import { validateScript, type GenerationInput, type ReferenceMaterial } from '../packages/adapters/generation.ts';
import type { GenerationProvider } from '../packages/adapters/providers.ts';
const captured_at = '2026-10-06T00:00:00Z';
const project_id = '10000000-0000-4000-8000-000000000001';
const factId = '20000000-0000-4000-8000-000000000001';
const brief = (product: string, statement: string, duration_seconds: number, filming_constraints: string[], audience = 'Remote workers') => Brief.parse({
  product, audience, goal: 'Show the product in a short filmable video', tone: 'Calm and practical', language: 'en',
  duration_seconds, filming_constraints,
  facts: [{ id: factId, statement, source: { kind: 'user', captured_at }, user_confirmed: true }],
});
const lamp = brief('Fictional rechargeable desk lamp', 'This rechargeable desk lamp has three brightness settings.', 20, ['One person', 'Home desk']);
const mug = brief('Fictional studio blue ceramic mug', 'The studio makes blue ceramic mugs.', 15, ['No face', 'No speech'], 'People who enjoy quiet desk rituals');
const meal = brief('Fictional meal planner app', 'The app supports weekly meal plans and shopping lists.', 25, ['One phone screen recording; no personal data'], 'Busy parents');
meal.facts[0]!.source = { kind: 'url', url: 'https://example.com/fictional-meal-planner', captured_at };
const oldBag = brief('Fictional bag', 'The bag has two pockets.', 15, ['Hands only'], 'Commuters');
const newBag = brief('Fictional bag', 'The bag has three pockets.', 15, ['Hands only'], 'Commuters');
export const lampReference: ReferenceMaterial = {
  reference: { id: 'fixture:desk-reveal', provider: 'authored_fixture', url: 'https://example.com/fictional-desk-reveal',
    observed_at: captured_at, permitted_use: 'fixture_only', permission_basis: 'Original fictional format notes authored for this repository; no external content.' },
  format_notes: 'Start with a locked-off view of an empty surface; bring the object into frame; demonstrate one feature in three quick cuts.',
  media_available: false, transcript: null, metrics: null,
};
export interface EvalCase {
  id: string; idea: string; input: GenerationInput;
  sections: Array<[string, string, string]>;
  references: ReferenceMaterial[];
  limitations: string[];
}
export const cases: EvalCase[] = [
  { id: 'B01-description', idea: 'One desk, three settings', input: { project_id, brief_version: 1, brief: lamp }, references: [], limitations: [], sections: [
    ['One desk. Three brightness settings.', '0–5s: Lock a phone on the home desk; lamp in frame.', 'Three settings'],
    ['Here is each one.', '5–15s: With exposure locked, show a hand cycling through all three settings. Label the cuts 1, 2, 3.', '1 → 2 → 3'],
    ['Which would you choose?', '15–20s: Hold on the lamp beside an open notebook.', 'Which setting?'],
  ] },
  { id: 'B01-reference', idea: 'A desk reveal in three cuts', input: { project_id, brief_version: 1, brief: lamp }, references: [lampReference], limitations: ['Adapted only from authored fixture format notes; no media, transcript, engagement metrics or real-world freshness evidence.'], sections: [
    ['An empty corner. One desk lamp.', '0–5s: Frame an empty desk corner, then slide the lamp into view.', 'A corner for your lamp'],
    ['Three brightness settings to try.', '5–15s: Match-cut the same fixed frame at each brightness setting; lock exposure.', 'Setting 1 / Setting 2 / Setting 3'],
    ['Which setting fits your desk?', '15–20s: A hand opens a notebook beside the lamp.', 'Your desk. Your setting.'],
  ] },
  { id: 'B02-silent', idea: 'A quiet blue-mug ritual', input: { project_id, brief_version: 1, brief: mug }, references: [], limitations: [], sections: [
    ['', '0–5s: Close-up of hands setting the blue ceramic mug on a plain desk; keep faces out of frame.', 'A little blue'],
    ['', '5–10s: Slowly turn the mug to show its shape and blue surface.', 'Blue ceramic'],
    ['', '10–15s: Pull back to show the mug beside a closed notebook. Silent soundtrack.', 'For your next quiet moment'],
  ] },
  { id: 'B03-product-page-fixture', idea: 'From week plan to shopping list', input: { project_id, brief_version: 1, brief: meal }, references: [], limitations: ['The example.com product page is a fictional fact source, not a fetched page.'], sections: [
    ['What is on the menu this week?', '0–5s: Screen recording of a fictional demo account with no private data.', 'This week’s meals'],
    ['Build your weekly meal plan.', '5–15s: Record the app’s actual weekly-plan screen; point to a meal entry. Confirm UI before filming.', 'Plan the week'],
    ['Keep your shopping list in the app too.', '15–25s: Switch to the shopping-list screen. Do not imply automatic list generation unless verified.', 'Weekly plans + shopping lists'],
  ] },
  { id: 'B05-old', idea: 'Two-pocket packing demonstration', input: { project_id, brief_version: 1, brief: oldBag }, references: [], limitations: ['Historical version only; must not replace work for brief version 2.'], sections: [
    ['Two pockets. What goes where?', '0–5s: Hands place the fictional bag on a table.', 'Two pockets'],
    ['Show your everyday setup.', '5–15s: Point to each of the two pockets. Use only objects confirmed to fit.', 'Your everyday setup'],
  ] },
  { id: 'B05-revised', idea: 'Three-pocket packing demonstration', input: { project_id, brief_version: 2, brief: newBag }, references: [], limitations: [], sections: [
    ['Three pockets. What goes where?', '0–5s: Hands place the fictional bag on a table.', 'Three pockets'],
    ['Show your everyday setup.', '5–15s: Point to each of the three pockets. Use only objects confirmed to fit.', 'Your everyday setup'],
  ] },
];
export const inaccessibleProfile = {
  id: 'B04-inaccessible', provenance: 'fixture', url: 'https://example.com/inaccessible-running-profile',
  supplied_description: 'I make beginner running videos.', status: 'needs_input', fetched: false,
  response: 'I have not inspected this profile. Paste a style example or describe the tone and filming setup you want. Dedicated creator workflows remain outside the current brand-brief slice.',
};
export function fixtureProvider(fixture: EvalCase): GenerationProvider {
  return { async generate(input) {
    // Reject accidental reuse against a different/version-changed brief rather than mislabel it.
    if (JSON.stringify(input) !== JSON.stringify(fixture.input)) throw new Error('Fixture input mismatch');
    const script = ScriptDraft.parse({ origin: 'fixture', project_id: input.project_id, brief_version: input.brief_version,
      language: input.brief.language, estimated_duration_seconds: input.brief.duration_seconds,
      sections: fixture.sections.map(([spoken, shot, on_screen_text]) => ({ spoken, shot, on_screen_text, fact_ids: [factId] })),
      reference_ids: fixture.references.map(ref => ref.reference.id),
      limitations: ['Hand-authored synthetic output; not a model-quality observation. Timing is estimated, not filmed.', ...fixture.limitations],
    });
    return validateScript(script, input, fixture.references);
  } };
}
