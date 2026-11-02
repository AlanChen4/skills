---
name: better-minimal-ship
license: MIT
description: Ship code with minimal changes and agreed scope.
---

# Better minimal ship

Deliver the requested behavior with the fewest necessary changes across code, data, dependencies, and operations. Minimize total complexity while preserving complete behavior.

Use `better-clear-language` for written output when available. Otherwise, use clear, simple ASD-STE100 style English. Continue without installing the skill if it is unavailable.

## Coordinate subagents

- Keep the parent focused on requirements, decisions, integration, and delivery. Delegate bounded exploration, implementation, testing, or review when each agent has a distinct job.
- Start subagents with fresh context. Supply the relevant goal, agreed scope, exclusions, decisions, evidence, file references, rules, permissions, and expected result. Do not copy the full conversation.
- Choose a suitable model and reasoning effort for each assignment. Astra requires explicit user approval. Otherwise, stay at or below the parent's cost tier; use current documented costs and ask before using a higher or unknown cost tier.
- Parallelize independent reading. Give editing agents separate ownership and coordinate shared changes. Apply these rules to further delegation.
- Request concise conclusions, source references, validation results, and unresolved questions. Keep raw logs out of the main conversation.
- Inspect and integrate agent results. Agent recommendations cannot authorize scope changes or external actions.

## Gather evidence

- Read relevant code, repository rules, and domain docs. Keep discovery read-only.
- Consult existing records, customer questions, error logs, or usage data when they answer a specific design question. Do not add tracking or collect new data without an explicit requirement.
- Present useful findings with sources, sample limits, and uncertainty. Separate facts from assumptions and explain how findings affect scope.

## Align before implementation

Use the evidence to present a concise scope proposal that states:

- The resulting behavior, affected surfaces, and exclusions.
- The smallest complete approach, simpler alternatives, maintenance costs, and meaningful tradeoffs.
- Suggest existing solutions we could reuse or adapt to reduce the changes. Name concrete candidates and explain what work they would eliminate and any added costs or dependencies.
- Suggest constraints we could relax to make the change substantially smaller. State the constraint, the behavior or capability we would give up, and the work we would avoid. Obtain agreement before changing the constraint.
- The specific files and folders to reuse or change, with their purpose.
- Any planned database changes, including affected tables, columns, and migrations. State when none are needed; flag details still to confirm.
- How to verify the result.

Before implementation:

- Require explicit scope agreement. Existing agreement in this conversation counts when it covers the proposed work; do not ask again for the same decision.
- Include only requested features. If additional behavior appears necessary, explain why and obtain agreement before including it.
- Continue useful read-only investigation while waiting. Silence and elapsed time do not count as agreement.
- Obtain new agreement for material changes to behavior, scope, access, or agreed tradeoffs. Resolve routine implementation details within scope without another approval step.

## Make the smallest complete change

- Reuse existing components, code paths, data models, and dependencies when they fit. Name the files, folders, and database objects involved in the scope proposal.
- Include supporting changes needed for the behavior to work through every affected layer.
- Avoid unrelated cleanup, speculative features, extension points, configuration, and compatibility layers without a current requirement.
- Add a dependency or abstraction only when it simplifies the complete solution and has a clear present use.
- Preserve access controls, data integrity, and safeguards against duplicate consequential actions.
- Report useful discoveries outside scope as observations. Obtain authorization before implementing them.

## Verify the behavior

- Run checks appropriate to the change and repository rules. Test observable outcomes and plausible regressions.
- Reuse existing coverage. Add tests for meaningful behavior; avoid tests that only mirror the implementation.
- Exercise changed user flows and confirm resulting data or side effects. Screenshots alone do not prove success.
- Test user flows in a browser. Check desktop and mobile when layout or interaction can differ.
- Use development fixtures for tests that change data or send messages. Follow existing authorization for external actions; scope agreement alone does not authorize production outreach, publication, or deployment.
- Report failures, skipped checks, and verification limits. Do not call a change verified while required checks remain unresolved.

## Review for removal

Give a fresh reviewer the agreed requirements and final diff. Ask which current requirement each addition serves. Have the parent assess the findings and remove unnecessary code and task artifacts:

- Unrequested behavior or speculative handling.
- Duplicate state, validation, storage, or functionality.
- Compatibility code for changes that have not shipped.
- Abandoned behavior in APIs, schemas, tests, or admin screens.
- Temporary scripts, debug code, unused fixtures, and development artifacts.
- Redundant tests and unrelated edits.

- Review changed tests under repository testing rules. Identify each test's plausible regression, observable consequence, and overlap with existing coverage.
- When removing redundant caller tests, preserve distinct policies, side effects, and setup required by the implementation.
- Remove unnecessary code across every affected layer. Preserve access controls, private-field restrictions, data integrity, and safeguards against duplicate consequential actions.
- Preserve user-owned work, deliberately retained artifacts, and reusable tools. Recheck behavior after removals.
- Stop simplifying when further removal would weaken correctness, clarity, or required behavior.

## Finish and give useful heads-ups

- Complete the requested delivery step. Create or update a PR when requested, following repository conventions. Match its title and description to the final implementation.
- Address review findings and complete required checks and browser evidence. Do not bypass check gates or report skipped checks as passed.
- In a PR, include the outcome, relevant evidence, verification results, tradeoffs, and rollout requirements. Report blockers and missing checks plainly.
- Merge, publish, or deploy only when authorized.
- Report what changed, verification results, and material limitations. Link the result when available.
- Give concise heads-ups about useful observations, such as an adjacent bug, confusing instruction, slow check, tool failure, or rollout requirement.
- For each heads-up, state what happened, its practical effect, and a concrete next step when clear. Separate facts from suspected causes.
- Combine duplicates and omit routine noise. Do not invent observations or create follow-up work automatically.
