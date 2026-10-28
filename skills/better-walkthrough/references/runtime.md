# Run a walkthrough

Resolve `<skill-directory>` to the installed folder containing SKILL.md. Commands work independently of the current working directory. The launcher uses assets/web/ and assets/d2/ from that installation.

## Check dependencies

Use Python 3.9 or newer, a current Node.js LTS release, and D2 with the diagram's selected layout engine. No npm or pip packages are required by the runtime.

```sh
python3 <skill-directory>/scripts/walkthrough.py --doctor
```

The check probes the required Node.js features and compiles a temporary diagram. To check an existing diagram's selected engine without changing its files, add `--walkthrough <walkthrough-directory>`.

If a dependency is missing, print setup instructions:

```sh
python3 <skill-directory>/scripts/walkthrough.py --setup
```

This command prints installation guidance from the official Python, Node.js, and D2 sites. It does not install software. Run `d2 layout` to list available engines. Use `--layout <name>` to explicitly override a diagram's selection; preserve its existing engine when updating a walkthrough unless a change is needed and explained.

## Compile and validate

Create an [external workspace](workspaces.md) and write its [content and diagram source](content-format.md), then run:

```sh
python3 <skill-directory>/scripts/walkthrough.py --walkthrough <walkthrough-directory> --check
```

The folder must contain content.js and diagram.d2. Compilation writes diagram.svg beside them. Validation checks:

- Missing or duplicate step IDs and an unknown start step.
- Missing transition targets and unreachable steps.
- Missing choice IDs or labels and duplicate choice IDs within a step.
- Steps that define both Next navigation and choices.
- Missing diagram nodes or connections and duplicate connection references.
- D2 person outlines stretched more than 20% from their natural width-to-height ratio, including their node IDs. This check recognizes the standard D2 person path; it does not inspect arbitrary icons or other shape types.

Resolve reported errors before serving. These checks validate structure; they do not certify business accuracy or the absence of visual collisions. Check explanations against the implementation during authoring. Use automatic layout; browser review is not required. Do not add AST analysis or business execution adapters by default.

To validate existing content against an already compiled SVG without recompiling:

```sh
node <skill-directory>/assets/web/validate.js <walkthrough-directory>/content.js
```

## Serve

```sh
python3 <skill-directory>/scripts/walkthrough.py --walkthrough <walkthrough-directory> --port 8765
```

Return the printed viewer URL and artifact directory. Choose an unused port when another viewer is running. Use Ctrl+C to stop the server.

For an initialized workspace, replace `--walkthrough <walkthrough-directory>` with `--repo <checkout> --name <workflow>`. Use the same storage override as initialization; see [workspace storage](workspaces.md#storage).

The server serves the bundled interface and files within the selected walkthrough folder. It recompiles changed D2 source and reloads changes to the web files and content. The shared interface preserves progress across refreshes. Its behavior is defined in [the authoring guidance](authoring.md#use-the-shared-interface).

Keep source repositories and unrelated walkthroughs outside the serving routes. Run the interface from the installed skill rather than copying it into the product repository. The runtime does not upload files or start a public deployment.
