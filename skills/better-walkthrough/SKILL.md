---
name: better-walkthrough
license: MIT
description: Use D2 diagrams to walk through code logic step-by-step.
---

# Better walkthrough

Explain one workflow from the current checkout with an interactive D2 diagram. Let the reader advance manually and choose concrete scenarios.

## Investigate

- Follow [authoring.md](references/authoring.md) to trace the implementation and explain its decisions.
- Include relevant uncommitted changes. Define the workflow's boundaries and flag unknown behavior.

## Create

- Follow [workspaces.md](references/workspaces.md) to create a local `.better-walkthrough/` folder.
- Keep product code and tracked configuration unchanged.
- Use [content-format.md](references/content-format.md) to write content.js and diagram.d2. Reuse the bundled interface.

## Validate

- Follow [runtime.md](references/runtime.md) to build standalone HTML. Resolve reported errors.
- Use the development server only for live reload. Build again after the final source edits.

## Deliver

- Return the artifact directory, validation results, and material uncertainties.
- Include the viewer URL when serving.
- Always end the final response with a clickable absolute-path link to the generated index.html.
