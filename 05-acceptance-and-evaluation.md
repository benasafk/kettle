# Kettle Acceptance and Evaluation

These proposed checks define observable behavior for development and a first pilot. Technical tests verify the implemented contract. Gustas and intended users judge whether the ideas and scripts are useful. Agent ratings can assist that review but do not replace customer evidence.

## Functional acceptance scenarios

| ID | Scenario | Passing behavior |
| --- | --- | --- |
| A01 | User signs in on the website and chooses Open in ChatGPT | Supported installation/connection flow opens; the connected Kettle account is the intended account |
| A02 | User provides only a description | A usable brief can be saved and discovery started without a URL |
| A03 | User provides a product website | Supported permitted content is used with provenance, or the user gets a useful description-based fallback |
| A04 | User provides an inaccessible social profile | Kettle does not pretend to have read it; it asks for the needed content or style details |
| A05 | User corrects the audience in the brief | A new brief version is saved and subsequent work uses it |
| A06 | Discovery takes longer than an ordinary tool response | Start returns a job ID; status is visible; the completed result can be retrieved after leaving and returning |
| A07 | Provider supplies fewer than eight suitable references | Results contain only supported matches and clearly explain any shortfall |
| A08 | User chooses an alternative idea | Its script is generated or reused; a failure preserves the previous usable script |
| A09 | User asks to shorten the script | A revision preserves supported facts and includes an explicitly estimated duration |
| A10 | Two chats edit the same script | A stale revision receives a conflict; newer work is preserved |
| A11 | A client or worker repeats a request | One logical job/save and one intended quota settlement result; actual provider retry costs are recorded |
| A12 | Worker stops during a job | Work resumes or reaches a recoverable failure; it is not silently lost |
| A13 | User saves and later opens a different chat | The same account retrieves the saved item and current script |
| A14 | User exports the script | Complete readable text is available even if panel clipboard access fails |
| A15 | Another account guesses a project, job, or script ID | Access is denied without exposing the record or its contents |
| A16 | Token expires or account connection is revoked | Further protected access fails according to the implemented token/revocation policy and offers reauthorization when appropriate |
| A17 | Stripe delivers the same event twice or events out of order | Entitlements remain correct; a browser checkout return cannot grant access by itself |
| A18 | A newer discovery finishes before an older one | The older completion does not replace the active newer result |
| A19 | Panel context is missing or stale | ChatGPT asks or refreshes before resolving “the second one” |
| A20 | User works on a supported phone surface or without the panel | The core journey remains usable; unsupported UI capabilities have a fallback |
| A21 | Account data is requested for export or deletion | Implemented retention and deletion behavior matches the published policy, including jobs, provider-held data where applicable, and backup handling |
| A22 | User reaches a usage limit or requests cancellation | Kettle prevents unauthorized new spending and explains what happens to running work and reserved usage |

Run A01–A16 and A18–A20 for the first integrated journey. Complete billing checks before paid testing and data-handling checks before collecting pilot users' real data. Use fixtures for deterministic failure cases, and a bounded live test for each real external integration.

## Added journey coverage

These cases map to the revised [user flows](02-user-flows.md). Baseline cases complete the proposed first release; conditional cases apply only when the corresponding addition is adopted. Later journeys do not become first-release requirements merely because they have an acceptance check.

| ID | Flow / scenario | Passing behavior | Gate |
| --- | --- | --- | --- |
| A23 | F02: user begins inside ChatGPT | Connect/sign up through the supported route and return to the requested task; declining authorization creates no duplicate work | Baseline |
| A24 | F03/F20: user returns without the old conversation or job ID | Authorized recent/active jobs and saved work can be found; new users see an appropriate empty state | Baseline |
| A25 | F05: user supplies both a product link and a reference video | Roles are distinguished; inaccessible sources have an honest description/paste fallback; reference content does not become a product fact | Baseline |
| A26 | F07: user brings an idea | Script can be generated from a persisted user-origin idea without a discovery search or fabricated references | If direct idea route adopted |
| A27 | F08: user asks only for feedback on pasted text | Feedback is returned without silently creating a project, importing content, or saving a rewrite | If pasted-script route adopted |
| A28 | F08: user asks to revise and keep a pasted script | Original is retained; the intended edit can be saved, exported, and resumed without a discovery result | If pasted-script route adopted |
| A29 | F11: user filters cards, then requests new references | Filter changes make no new provider search; explicit refinement creates the intended job against the correct visible idea | Baseline |
| A30 | F09: user changes one script's tone or the whole project brief | Scope is resolved; only the intended state changes; prior outputs retain their input versions; no automatic paid rerun | Baseline |
| A31 | F13: user asks for a suggested change, then chooses Keep mine or Use new | Keep mine preserves current content; Use new accepts the candidate only if its base remains current | Baseline comparison proposal |
| A32 | F15: user selects an old revision and undoes an edit | Restored content becomes a new current revision; original and intervening history remain available | Baseline |
| A33 | F14: user requests a silent/no-face or translated variant | Original remains intact; variant has explicit identity and independent revisions; selected variant is exported | When that variant type is adopted |
| A34 | F17: user saves twice, undoes save, then saves again | One saved association is created; unsave preserves script/history; subsequent save works predictably | Baseline |
| A35 | F16: user exports, marks filmed, then corrects the status | Export alone never marks filmed; explicit status/date changes persist across chats and can be corrected | Baseline |
| A36 | F18: user switches between projects | Reads, edits, searches, and saves use the selected project; a different product does not silently replace the current brief | Baseline |
| A37 | F18: user archives/restores or deletes a project while a job runs | Archive is reversible; deletion is explicitly confirmed; late completion cannot recreate deleted content | When management is adopted |
| A38 | F19: user replaces a hook from Explore | Permitted source and adaptation are presented; acceptance changes only the intended section through version checks; undo works | Later; source permissions required |
| A39 | F21: checkout succeeds but entitlement update is delayed | Pending state is honest; browser return does not grant access; verified event grants access once; task can be resumed | Before paid use |
| A40 | F22: renewal fails, cancellation takes effect, or account reactivates | Access and effective dates follow adopted policy; data is not silently deleted; allowed saved-work operations remain correct | Before paid use |
| A41 | F23: user disconnects and reconnects | Revoked access fails per token policy; subscription/data effects are not conflated; reconnection resolves the intended account | Baseline |
| A42 | F25: user reports a failed job or bad script | Intended context reaches an implemented support/feedback destination; no full conversation forwarded by default; acknowledgement is truthful | Before offering that support/feedback route |
| A43 | F20: user cancels as a job completes | One final outcome and usage settlement; actual provider cost tracked; no promise of a refund or stopped operation without evidence | Baseline |

Include baseline additions in the integrated journey gate. Add A26–A28 if direct idea/script intake is chosen. A31 requires the candidate/accept contract described in the tools proposal. Evaluate creator/founder variants against supplied facts and declared filming constraints when those audiences enter scope.

## Selected hosting integration

| ID | Scenario | Passing behavior | Gate |
| --- | --- | --- | --- |
| A44 | Workers MCP + Supabase + Workflows integration | Authenticated tool writes/reads the intended account's data; a workflow recovers after a failed attempt; a saved job whose dispatch failed is reconciled; repeated delivery creates no duplicate result or quota settlement; unauthorized access is rejected | M1, before expanding the hosted implementation |

Test against actual development services when credentials and access are available. Fixture success alone does not establish the hosted integration. Record runtime compatibility, job outcome, database latency, and observed usage separately from product-quality evaluation.

## Fictional implementation briefs

These examples are invented test inputs, not customer evidence or approved marketing copy. Reference fixtures should use clearly synthetic IDs and reserved domains such as `example.com`, or material whose use is permitted. Never present fixture metrics as real performance.

| Brief | Supplied facts and constraints | Expected behavior |
| --- | --- | --- |
| B01 Desk lamp | A fictional rechargeable desk lamp has three brightness settings. Audience: remote workers. One person, home desk, 20 seconds. No link. | Offer practical desk-based concepts; do not invent battery life, brightness specifications, or sales numbers |
| B02 Ceramic mug | A fictional small studio makes blue ceramic mugs. Tone: calm. No face or speech. 15 seconds. | Use hands, shots, and on-screen text; do not invent dishwasher safety or sustainability certifications |
| B03 Meal planner | A fictional app supports weekly meal plans and shopping lists. Audience: busy parents. 25 seconds. A supplied product page fixture contains these facts. | Demonstrate the workflow; avoid unsupported savings or health claims |
| B04 Creator profile | User supplies an inaccessible profile link and says they make beginner running videos. | Ask for style examples or a description; do not claim the profile was inspected. Treat a dedicated creator workflow as outside the proposed first release |
| B05 Revised product fact | A fictional bag brief originally lists two pockets. The user corrects it to three before an old job completes. | New work uses three pockets; the older result remains tied to the previous brief and does not silently replace current work |

## Script quality rubric

Rate relevance to the brief, strength of the opening, clarity, filming practicality, and freshness of adaptation from 1 to 5. A 1 requires substantial rework; a 3 is usable with editing; a 5 is ready for the intended creator with minimal changes. Treat factual integrity and appropriate reference use as separate pass/fail checks.

For the first evaluation, use the five test briefs plus real briefs supplied by Gustas. Generate multiple runs to reveal inconsistency. Record the original output and the user's edits. Compare a subset with ordinary ChatGPT drafting using the same brief and judge whether Kettle's references materially improve the result.

Before a pilot, Gustas should adopt a quality threshold. A proposed starting target is at least 4 out of 5 on relevance and filming practicality for most evaluated brand briefs, with no accepted unsupported material business claims. This target is a proposal, not a measured result.

## Timing and cost measurements

Record request acknowledgement time, reference-search time, time to first usable idea, time to a ready script, and full refinement time. Measure from the user's action; a display update five seconds after a result is ready does not describe the actual waiting experience.

Report median and upper-percentile times when enough observations exist. Separate fixture results from live-provider measurements. Set actual release thresholds after the integration tests expose realistic ranges.

Track initial discovery, additional searches, alternate scripts, revisions, retries, and infrastructure allocation. Separate Kettle's cost from the quota charged to the customer. Review both typical and heavy-use accounts before setting a flat subscription allowance.

## Pilot observations

Ask participants to choose an idea, revise a script, export it, and return later. Observe where they get stuck. Record whether they report filming the result and why they did or did not. Start with a small number of intended customers; the proposed five-to-ten-person pilot is directional learning, not proof of market demand.
