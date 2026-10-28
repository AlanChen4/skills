# External workspaces

Create the workspace before writing walkthrough files:

```sh
python3 <skill-directory>/scripts/walkthrough.py --init --repo <checkout> --name order-fulfillment
```

The command prints the absolute output folder. Write content.js and diagram.d2 there. Initialization needs Python and uses Git when available; it does not require Node.js or D2. It creates manifest.json but does not create scenario content.

Follow [runtime.md](runtime.md) to compile, validate, and serve the workspace. The launcher accepts either `--repo <checkout> --name <workflow>` or `--walkthrough <folder>` for an existing directory.

Keep generated files outside the product checkout unless the user explicitly requests repository artifacts. The launcher rejects output roots inside the source checkout when using `--init` or `--repo`.

## Storage

The default root is:

- Linux: $XDG_DATA_HOME/better-walkthrough, or ~/.local/share/better-walkthrough when XDG_DATA_HOME is unset or relative.
- macOS: ~/Library/Application Support/better-walkthrough.
- Windows: %LOCALAPPDATA%/better-walkthrough, with the user's AppData/Local folder as a fallback.

Override the root with BETTER_WALKTHROUGH_HOME or `--output-root <directory>`. Use the same override when initializing, checking, and serving. The command-line option takes precedence.

Each root contains `<repository-name>-<checkout-path-hash>/<workflow-name>/`. Git worktrees have distinct paths and therefore separate workspaces. A branch switch within one worktree reuses its workspace. Workflow names use up to 64 lowercase letters, digits, and hyphens. Renaming or moving a checkout changes its workspace key; `--walkthrough` can still open the old folder.

## Source identity

manifest.json records the source checkout path, commit, branch, and dirty status observed during initialization. It supports directories without Git and repositories without commits; unavailable fields are null. Keep repository-relative implementation references in content.js as described in [the content format](content-format.md#source-references).

Rerunning `--init` refreshes the observed source metadata and preserves existing content, diagrams, and the manifest's creation time. Reconcile the content against that source before presenting an updated explanation. Metadata describes the observed checkout; it does not prove that existing content matches it.

Keep example IDs and storage keys unchanged when moving files to preserve browser progress at the same viewer origin. Use distinct content IDs for separate worktrees when they should have independent exploration state.

Read the source repository without changing its code, AGENTS.md, or ignore files. Exporting or copying artifacts into a product repository requires an explicit user request.
