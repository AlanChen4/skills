---
name: better-minimal-ship
license: MIT
description: Ship features and code changes with the smallest complete implementation, required scope alignment, focused verification, and useful heads-ups.
---

# Better minimal ship

Deliver the requested behavior with the fewest necessary changes across code, data, dependencies, and operations. Minimize total complexity, not just line count. A short patch that leaves broken behavior or shifts avoidable work to users is not complete.

## Align before implementation

Read the relevant code and repository rules. Gather enough evidence to identify the current behavior, the requested outcome, and existing code that can support it. Keep discovery focused on decisions that affect the change.

Before editing implementation files, present a concise scope proposal:

- The resulting behavior and affected surfaces.
- What the change excludes.
- The smallest complete approach and any meaningful tradeoffs.
- How to verify the result.

Require explicit scope agreement before implementation. Agreement already given in this conversation counts when it covers the proposed work. Do not ask again for the same decision. Silence and elapsed time do not count as agreement. Continue useful read-only investigation while waiting.

If new evidence requires a material change to behavior, scope, access, or an agreed tradeoff, explain it and obtain agreement before doing that work. Resolve routine implementation details within the agreed scope without another approval step.

## Make the smallest complete change

Reuse existing components, code paths, data models, and dependencies when they fit. Include the supporting changes needed for the requested behavior to work through every affected layer.

Avoid unrelated cleanup, speculative features, extension points, new configuration, and compatibility layers without a current requirement. Add a dependency or abstraction only when it makes the complete solution simpler and has a clear present use.

Preserve access controls, data integrity, and safeguards against duplicate consequential actions. Do not remove necessary protections to make the diff smaller.

Keep useful discoveries outside the agreed scope as observations. Do not turn them into extra implementation work without authorization.

## Verify the behavior

Run checks appropriate to the change and repository rules. Test the observable outcome and plausible regressions. Reuse existing coverage; add tests when they protect meaningful behavior. Avoid tests that only mirror the implementation.

For changes to a user flow, exercise the affected interaction and confirm its result. Check resulting data or side effects when relevant. A screenshot alone does not prove that an operation succeeded.

Use development fixtures for tests that change data or send messages. Scope agreement does not authorize production outreach, publication, or deployment. Follow the user's existing authorization for external actions.

Report failures, skipped checks, and verification limits accurately. Do not call a change verified while required checks remain unresolved.

## Review for removal

Review the final diff against the agreed outcome. For each addition, identify the current requirement it serves. Remove unnecessary code and artifacts created for this task, including:

- Unrequested behavior or speculative handling.
- Duplicate state, validation, storage, or functionality.
- Abandoned paths, temporary debug code, and unused fixtures.
- Redundant tests and unrelated edits.

Preserve user-owned work and tools that still serve a purpose. Recheck affected behavior after removals. Stop simplifying when further removal would weaken correctness, clarity, or required behavior.

## Finish and give useful heads-ups

Complete the requested delivery step. Create or update a PR when requested, following repository conventions. Merge, publish, or deploy only when authorized. Keep the title and description aligned with the final implementation.

Report what changed, how it was verified, and any material limitations. Link the result when available.

Include concise heads-ups for useful observations from the work, such as a relevant adjacent bug, confusing instruction, slow check, tool failure, or rollout requirement. State what happened, its practical effect, and a concrete next step when clear. Distinguish observed facts from suspected causes. Combine duplicates, omit routine noise, and do not invent observations or create follow-up work automatically.
