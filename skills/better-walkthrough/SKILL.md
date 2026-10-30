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

Follow [runtime.md](references/runtime.md) to build a standalone walkthrough. Use the development server only for live reload. Resolve reported errors.

## Deliver

Always build the standalone HTML before delivery, including when using the development server. Return the artifact directory, validation results, and material uncertainties. Include the viewer URL when serving. End the final response with a clickable link to the generated index.html file, using its absolute path.
