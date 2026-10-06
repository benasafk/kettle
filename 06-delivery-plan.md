# Kettle Delivery Plan

The proposed delivery order establishes shared contracts, proves the external dependencies, and then completes one usable journey. Keep work in small changes that can be demonstrated and reviewed.

## Agent responsibilities

| Role | Responsibility |
| --- | --- |
| Gustas | Product priorities, design judgment, script examples, commercial choices, provider agreements, and pilot feedback |
| Lead engineer | Shared architecture and contracts, task sequencing, integration, decision log, and delivery evidence |
| Backend specialist | Identity, permissions, data, MCP tools, versions, quotas, and billing |
| Interface specialist | Website handoff, panel, mobile behavior, and interaction states |
| Reference and generation specialist | Provider adapter, query behavior, prompts, ranking, generation, and cost measurements |
| Reviewer | Independent examination of behavior, failures, permissions, and acceptance evidence |

Activate these roles as tasks require them. Start with a lead and up to two implementation specialists, then use a reviewer for completed changes. A role does not require a permanent separate process or a separate application service.

## M0 Establish the implementation baseline

Owner: lead engineer.

Use the confirmed initial stack: Cloudflare Workers + Workflows and Supabase Postgres. Render is a conditional fallback for demonstrated runtime requirements. Keep shared application code separate from Cloudflare-specific adapters; do not build a second hosting implementation upfront.

Use this pack as the starting point. Inspect the actual repository and available designs, settle reversible technical choices, record unresolved owner decisions, and create executable shared schemas from the proposed tool/data contracts. Establish the basic repository layout and reproducible setup instructions.

Use F01–F26 in the expanded user-flow inventory to choose release scope explicitly. Resolve the direct idea/script intake proposals and candidate/accept behavior before freezing schemas. The additional contract table identifies missing operations; do not assume the original tool list implements every documented journey. Map adopted flows to the acceptance cases, including A23–A43 where applicable.

Done when another agent can identify its task, inputs, file ownership, and completion checks without reconstructing this chat. Shared contracts and the decision log must be in the branch used for new workspaces. Keep this milestone small; proceed to connection tests once the necessary contracts exist.

## M1 Prove the external connections

Two assignments can proceed independently after the baseline is shared.

| Assignment | Owner | Evidence required |
| --- | --- | --- |
| Website and ChatGPT connection | Backend specialist, with a minimal website | A test user signs in, connects ChatGPT through OAuth, and reads account state through a hosted MCP tool; another account is rejected when accessing private records |
| Reference-provider feasibility | Reference specialist, with Gustas handling permissions | Documented available fields, access limits, measured response time and cost, supported uses, and failure behavior; fixture adapter also works |

A private integration uses the supported developer connection path. The final public Open in ChatGPT handoff is verified after the production listing exists. In this milestone, prove a hosted authenticated MCP request on Workers, a Supabase write/read, and one Cloudflare Workflows job that resumes after a failed attempt without duplicate results or quota settlement. Also test recovery when dispatch fails after the Supabase job is saved. Verify the chosen libraries in the actual runtime, and test a minimal panel. The hosted-stack check is A44.

The provider test can proceed with permitted fixtures while commercial-use questions remain open. Real external access must stay within its existing permission. The provider task is not complete merely because an API responds.

## M2 Complete the first user journey

Implement description and supported-link intake, a saved brief, queued discovery, ideas, script selection, chat revision, version preservation, Vault saving, plain-text export, and retrieval from a later chat.

The interface specialist can build against fixtures matching the shared contract while backend and generation work proceed. The lead integrates frequently. A UI mock alone does not complete this milestone; demonstrate the journey in ChatGPT with the actual server and durable data.

Done when the applicable acceptance scenarios pass, failures preserve saved work, and at least one permitted live-provider run has been measured if live references will be offered in the pilot.

## M3 Prepare a paid or private pilot

Implement the adopted trial/entitlement policy, bounded usage, cost records, external billing if charging, data handling, monitoring, and recovery. Complete the relevant public listing requirements when public distribution is intended.

Run the acceptance cases that cover payment state, duplicate and reordered events, worker interruption, account isolation, and export/deletion. Evaluate real example briefs and scripts with Gustas. Test the supported desktop and phone surfaces and the chat-only route.

Done when the pilot audience, supported features, provider permissions, quality standard, spending limits, and support owner are recorded, and users can complete the full journey.

## M4 Expand from observed use

Use pilot evidence to prioritize creator and founder workflows, more complete project management, richer Studio variants, and possibly Explore. Excerpt libraries require their own data and rights decision before implementation against third-party material.

## Conductor workflow

Use a workspace per independently deliverable task. Agents reviewing the same change can share a workspace with explicit edit ownership. Separate workspaces do not receive each other's uncommitted changes; merge shared contracts first and communicate changes through the repository and task handoffs. [Conductor first workspace](https://www.conductor.build/docs/first-workspace), [parallel agents](https://www.conductor.build/docs/concepts/parallel-agents).

Use setup and run scripts so a fresh workspace can reproduce the environment. Conductor workspaces isolate Git state, not operating-system permissions. Give development tasks appropriate test credentials and avoid mixing them with production account access.

## Task brief template

Each task should state the user outcome, current contract version, owned files or modules, dependencies, required acceptance cases, allowed external test budget, and expected handoff.

Example: implement `save_script_revision` against the shared schema. Preserve previous content, reject stale base versions, and enforce ownership. Demonstrate a successful revision, duplicate submission, competing edits, and a denied cross-account request. Return a reviewable change, the checks performed, and any unresolved dependency.

The lead accepts work based on integrated behavior and evidence. The original task author may review the implementation, but a separate reviewer should examine security-sensitive and payment behavior before release.
