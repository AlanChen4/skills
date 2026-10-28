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

Follow [workspaces.md](references/workspaces.md) to create a local `.better-walkthrough/` folder with a self-ignoring `.gitignore`. Keep product code and tracked configuration unchanged.

Use [content-format.md](references/content-format.md) to write content.js and diagram.d2. Reuse the bundled interface.

## Validate

Follow [runtime.md](references/runtime.md) to check or serve the walkthrough. Resolve reported errors.

## Deliver

Return the viewer URL and artifact directory, with validation results and material uncertainties.
