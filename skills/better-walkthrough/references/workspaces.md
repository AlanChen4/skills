# Local walkthrough folders

Create the folder before writing artifacts:

```sh
python3 <skill-directory>/scripts/cli.py --init --repo <checkout> --name order-fulfillment
```

The command prints `<checkout>/.better-walkthrough/order-fulfillment/`. Write content.js and diagram.d2 there. Initialization requires only Python; Git locates the checkout root when available.

The CLI first writes `.better-walkthrough/.gitignore` containing `*`. This ignores the folder's contents, including the ignore file itself, without changing tracked configuration. Initialization refuses a folder containing tracked artifacts.

- Each worktree has its own folder. Branches in the same worktree share it.
- Rerunning `--init` preserves existing content and diagrams.

Follow [runtime.md](runtime.md) to check and serve the walkthrough. Use `--repo <checkout> --name <workflow>` to find it again, or `--walkthrough <folder>` to open any existing folder, including older external workspaces.
