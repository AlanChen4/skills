# Local walkthrough folders

Create the folder before writing artifacts:

```sh
python3 <skill-directory>/scripts/cli.py --init --repo <checkout> --name order-fulfillment
```

The command prints `<checkout>/.better-walkthrough/order-fulfillment/`. Write content.js and diagram.d2 there. Initialization requires only Python; Git locates the checkout root when available.

The CLI first writes `.better-walkthrough/.gitignore` containing `*`. This ignores the folder's contents, including the ignore file itself, without changing the project's root .gitignore or Git configuration. Existing tracked files cannot be ignored, so initialization refuses a folder containing tracked artifacts.

- Each worktree has its own folder. Branches in the same worktree share it.
- Workflow names use up to 64 lowercase letters, digits, or hyphens.
- Rerunning `--init` preserves existing content and diagrams.
- No repository hashes, platform-specific storage roots, or manifests are needed.

Follow [runtime.md](runtime.md) to check and serve the walkthrough. Use `--repo <checkout> --name <workflow>` to find it again, or `--walkthrough <folder>` to open any existing folder, including older external workspaces.

Keep repository-relative implementation references in content.js as described in [the content format](content-format.md#source-references). Keep example IDs, storage keys, and connection order unchanged when moving files to preserve browser progress at the same viewer origin.

Keep product code, AGENTS.md, tracked ignore rules, and Git configuration unchanged. The local artifact folder and its own .gitignore are the only files this storage convention adds to the checkout.
