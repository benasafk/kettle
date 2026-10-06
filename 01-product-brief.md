# Kettle Product Brief

Status: proposed first-release specification, based on the product-jobs document and subsequent discussion. Read the decision register for the status of individual choices.

## Product purpose

Kettle helps someone decide what video to make and leave with a script they can film. The user supplies a website, product link, social profile, reference video, or a written description. ChatGPT helps clarify the brief. Kettle retrieves permitted references, develops ideas suited to the user's product and audience, saves the selected script, and preserves later revisions.

Kettle's value should be visible in the relevance of its references, the practicality of its scripts, and the ability to resume work across conversations. A comparison with ordinary ChatGPT drafting should be part of the pilot.

## Confirmed product direction

- Kettle is accessed through a ChatGPT plugin backed by an MCP server.
- The website entry flow includes sign-up or sign-in followed by an **Open in ChatGPT** handoff.
- A URL is optional. Users may explain what they want to create entirely in chat.
- The product supports generating video ideas and revising scripts.
- Account data, payment handling, and durable product state belong on Kettle's backend.
- Stripe is the intended payment provider.
- Supabase Postgres is the selected database.
- Start with Cloudflare Workers + Workflows. Render is the fallback if more runtime flexibility is required.
- Lightreel is an option to evaluate, rather than a guaranteed source of usable commercial reference data.

## Proposed first audience

Start with people creating short promotional videos for a brand or product. A founder may use this path to promote their product. Dedicated founder-story and creator-profile workflows can follow after the first journey is validated.

This narrower launch scope is an engineering recommendation. Gustas still chooses the initial customer segment.

## Proposed first release

| Area | Included behavior |
| --- | --- |
| Website | Sign up, sign in, account page, Open in ChatGPT handoff, and billing before a paid launch |
| Intake | Accept a description or a supported link; ask only for information needed to make a useful brief |
| Brief | Store product, audience, goal, tone, language, filming constraints, and sourced facts; let the user correct them |
| Discover | Show a recommended idea and up to seven alternatives when sufficient relevant references exist; explain fit and show sources |
| Studio | Show a script with spoken lines, suggested shots, on-screen text where relevant, and estimated timing |
| Revision | Revise through chat, save versions, recover the prior version, and preserve work if generation fails |
| Vault | Save an idea and script, list saved work, resume in another chat, and record a user-reported filmed status |
| Export | Return the complete script as plain text; add panel copy support where available |
| Reliability | Authentication, ownership checks, background job status, bounded retries, usage limits, and cost measurement |

Explore libraries, third-party video excerpts, automatic social publishing, video rendering, scheduled discovery, and team collaboration are proposed later work. Eight cards is a display target, not permission to invent or pad references.

The [expanded user flows](02-user-flows.md) describe 26 journeys across entry, creation, revision, saved work, and account lifecycle. Two additional first-release routes are recommended but not yet adopted: generating a script from the user's own idea, and reviewing/revising pasted script text without requiring discovery. Dedicated creator/founder flows and Explore remain documented as later scope rather than disappearing from the full product specification.

## Content rules

Business claims must come from the user or a permitted, identified source. Missing facts should be omitted, questioned, or shown as explicit placeholders. Metrics need a source and observation date. Estimated speaking duration must be labelled as an estimate.

Reference-backed generation should adapt a useful format to the user's brief. It should not reproduce another creator's script or claim a performance outcome for the user's future video. Use of reference content depends on the applicable permissions recorded for that source.

## Measures of value

Measure whether people choose an idea, export a script, report filming it, and return. Define denominators and observation windows before comparing rates. Filmed status is self-reported unless a separate verification mechanism is implemented.

Measure all costs associated with a complete journey, including searches, refinements, generation, retries, and allocated infrastructure. The original $49 monthly price, approximately ten monthly runs, and $0.90 initial-result target are assumptions to evaluate, not approved launch terms.
