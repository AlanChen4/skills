---
name: better-minimal-ship
license: MIT
description: Ship code with minimal changes and agreed scope.
---

# Better minimal ship

Deliver the requested behavior with the fewest necessary changes across code, data, dependencies, and operations. Minimize total complexity while preserving complete behavior.

Use `better-clear-language` for written output when available. Otherwise, use clear, simple ASD-STE100 style English. Continue without installing the skill if it is unavailable.

## Align before implementation

Read the relevant code and repository rules. Gather evidence for a concise scope proposal that states:

- The resulting behavior, affected surfaces, and exclusions.
- The smallest complete approach and meaningful tradeoffs.
- The specific files and folders to reuse or change, with their purpose.
- Any planned database changes, including affected tables, columns, and migrations. State when none are needed; flag details still to confirm.
- How to verify the result.

Before implementation:

- Require explicit scope agreement. Existing agreement in this conversation counts when it covers the proposed work; do not ask again for the same decision.
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
- Use development fixtures for tests that change data or send messages. Follow existing authorization for external actions; scope agreement alone does not authorize production outreach, publication, or deployment.
- Report failures, skipped checks, and verification limits. Do not call a change verified while required checks remain unresolved.

## Review for removal

Review the final diff against the agreed outcome. Identify the current requirement each addition serves. Remove unnecessary code and task artifacts:

- Unrequested behavior or speculative handling.
- Duplicate state, validation, storage, or functionality.
- Abandoned paths, debug code, and unused fixtures.
- Redundant tests and unrelated edits.

Preserve user-owned work and useful tools. Recheck behavior after removals. Stop simplifying when further removal would weaken correctness, clarity, or required behavior.

## Finish and give useful heads-ups

- Complete the requested delivery step. Create or update a PR when requested, following repository conventions. Match its title and description to the final implementation.
- Merge, publish, or deploy only when authorized.
- Report what changed, verification results, and material limitations. Link the result when available.
- Give concise heads-ups about useful observations, such as an adjacent bug, confusing instruction, slow check, tool failure, or rollout requirement.
- For each heads-up, state what happened, its practical effect, and a concrete next step when clear. Separate facts from suspected causes.
- Combine duplicates and omit routine noise. Do not invent observations or create follow-up work automatically.
