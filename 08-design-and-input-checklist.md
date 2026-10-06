# Kettle Design and Input Checklist

The design reference is [the Paper file](https://app.paper.design/file/01M39TTB7DKFHZY2JVDMAEDZ81), page **Kettle – Core foundations**. The user's instruction is to review only that page and preserve it. Frame mappings below come from the supplied product-jobs text; verify them against exports before treating them as exact screen specifications.

## Screens to export from Paper

| Flow | References in the supplied jobs text | What the agent needs to see |
| --- | --- | --- |
| Returning user and intake | 1.0, 1B, 1D–1F | Project selection, input handling, and broken-link behavior |
| Brief review | 1.5A–1.5C | Which fields exist and how corrections work |
| Discover progress and results | 2A, 2B | Card hierarchy, recommended idea, alternatives, and sources |
| Discover actions and failures | 2C–2G | Save, select, no-match, failure, and missing preview states |
| Minimal Studio | 3A–3E | Script structure, shortening, revisions, choices, and undo |
| Later Studio options | 3F, 3H | Silent/no-face variants and storyboard, if retained in scope |
| Vault and project home | P1, P2, P4 | Saved work, filmed status, project actions |
| Explore | 4A–4M | Later-phase reference only until scope and permissions are settled |

Add desktop and phone views where available, plus fonts, colors, spacing, and interaction notes. A missing design is a design task, not permission to infer that a screen already exists.

The website signup, account page, and Open in ChatGPT success screen also need a design or a small agreed wireframe. They may be outside the original Paper page; create new reference artifacts separately if requested rather than altering that page.

The expanded flow review also identifies these interaction specifications to supply or create separately: ChatGPT-first connection and recovery; returning-user project/job selection; direct idea and pasted-script intake if adopted; feedback versus Keep mine / Use new; filtered-empty versus search-no-match; cancellation and delayed completion; Vault unsave versus script deletion; pending checkout, expired access, and reconnection; data export/deletion and support. Some can be short chat examples and state descriptions rather than new panel screens. There is no claim that they already exist in Paper.

## Examples to supply

- Five real product briefs with audience, goal, tone, and filming constraints.
- Three scripts Gustas considers good, with a short explanation of why each works.
- Two examples that are unacceptable, showing what Kettle should avoid.
- References and assets whose use is permitted, along with the basis for access/display/reuse.
- An example of a user-requested script revision and the desired result.

The fictional briefs in the acceptance document are enough to start deterministic implementation. Real examples are needed to establish the product's creative standard.

## Accounts and integration information

Provide development access as each milestone needs it: identity provider, database, model API, reference provider, Stripe test mode, and the chosen host. Store secrets through the development environment rather than in this pack.

Record callback configuration, public domains, supported regions, and provider account limits in deployment documentation once verified. Keep reviewer credentials in the appropriate secure submission mechanism.

## Source inventory

| Material | Included here | Status |
| --- | --- | --- |
| Original product-jobs text | Yes, in references | Unchanged source; some assumptions are corrected in the decision register |
| Earlier architecture document | Yes, in references | Historical architecture; do not treat Google Cloud as a confirmed choice |
| New flow diagrams | Yes, as Mermaid in the user-flows and architecture documents | Proposed sequences based on the written requirements |
| Paper screen exports | No | Needed for faithful interface implementation |
| Original embedded UML diagrams | No | The original text contained placeholders rather than diagram contents |
| Real customer briefs and owner-approved scripts | No | Needed for creative evaluation |
| Provider agreements and credentials | No | Needed before the corresponding live integration or pilot |
