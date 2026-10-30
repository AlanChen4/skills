# Local walkthrough folders

Create the folder before writing artifacts:

```sh
python3 <skill-directory>/scripts/cli.py --init --repo <checkout> --name order-fulfillment
```

- Write content.js and diagram.d2 in the printed `<checkout>/.better-walkthrough/order-fulfillment/` folder.
- Initialization needs only Python. Git locates the checkout root when available.
- The CLI writes `.better-walkthrough/.gitignore` containing `*`, which also ignores itself. It refuses folders with tracked artifacts.
- Each worktree has its own folder. Branches in one worktree share it.
- Rerunning `--init` preserves existing files.
- Use `--repo <checkout> --name <workflow>` to find the folder again, or `--walkthrough <folder>` for any existing folder, including older external workspaces.
- Edit the sources and [rebuild](runtime.md). Keep generated HTML unchanged; other walkthrough folders are unaffected.
