---
name: better-walkthrough
license: MIT
description: Use D2 diagrams to walk through code logic step-by-step.
---

# Better walkthrough

Explain one workflow from the current checkout with an interactive D2 diagram. Let the reader advance manually and choose concrete scenarios.

## Investigate

Read [authoring.md](references/authoring.md) to trace the implementation and explain its decisions. Include relevant uncommitted changes. Clarify the workflow's boundaries when needed, and flag behavior the source does not establish.

## Create

Follow [workspaces.md](references/workspaces.md) to create an external workspace. Keep the product checkout unchanged unless the user requests changes.

Use [content-format.md](references/content-format.md) to write content.js and diagram.d2. Reuse the bundled interface and the authoring guide's diagram and interaction rules.

## Validate

Follow [runtime.md](references/runtime.md) to run `--check` for compilation, reference validation, and viewer HTTP checks. Serving runs the same checks, so use one path without repeating validation. Resolve reported errors. Structural checks do not certify business accuracy; ground the explanation in the implementation.

## Deliver

Start the viewer using the runtime guide. Return the local URL and artifact directory, with validation results and material uncertainties. Preserve progress when updating an existing walkthrough.
