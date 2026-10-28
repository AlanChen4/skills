# Run a walkthrough

Resolve `<skill-directory>` to the installed folder containing SKILL.md. Commands work independently of the current working directory. The launcher uses assets/web/ and assets/d2/ from that installation.

## Compile and validate

Create a [local walkthrough folder](workspaces.md) and write its [content and diagram source](content-format.md), then run:

```sh
python3 <skill-directory>/scripts/cli.py --walkthrough <walkthrough-directory> --check
```

This single command checks dependencies, compiles D2, validates content and connections, and checks the viewer's HTTP routes using a temporary local server. The temporary server stops before the command exits. Do not repeat validation with the internal JavaScript validator or separate HTTP requests.

Add `--json` for a machine-readable report with the workflow ID, step and connection counts, checked route count, artifact directory, and content and diagram routes. Success exits with 0; check failures exit with 1; invalid arguments exit with 2. Diagnostics go to stderr. Use `--help` for examples.

The folder must contain content.js and diagram.d2. Compilation writes diagram.svg beside them. Validation checks:

- Missing or duplicate step IDs and an unknown start step.
- Missing transition targets and unreachable steps.
- Missing choice IDs or labels and duplicate choice IDs within a step.
- Steps that define both Next navigation and choices.
- Missing diagram nodes or connections and duplicate connection references.
- Missing or ambiguous named connections, including endpoints within groups.
- D2 person outlines stretched more than 20% from their natural width-to-height ratio, including their node IDs. This check recognizes the standard D2 person path; it does not inspect arbitrary icons or other shape types.
- Viewer HTML, configuration, shared JavaScript and CSS, content, SVG, and reload routes return the expected data.

Resolve reported errors before serving. These checks validate structure and HTTP delivery; they do not certify business accuracy, browser execution, or the absence of visual collisions. Check explanations against the implementation during authoring. Use automatic layout; browser review is not required. Do not add AST analysis or business execution adapters by default.

## Diagnose dependencies

Use Python 3.9 or newer, a current Node.js LTS release, and D2 0.9.0 or newer with bundled TALA. No npm or pip packages are required by the runtime. The CLI always compiles with TALA and downward flow, overriding layout settings in the source or environment. There is no layout parameter.

```sh
python3 <skill-directory>/scripts/cli.py --doctor
```

Use this diagnostic when dependencies fail; it is not required before `--check`. It probes the required Node.js features and compiles a temporary diagram with TALA. To check an existing diagram without changing its files, add `--walkthrough <walkthrough-directory>`.

If a dependency is missing, print setup instructions:

```sh
python3 <skill-directory>/scripts/cli.py --setup
```

This command prints installation guidance from the official Python, Node.js, and D2 sites. It does not install software. D2 0.9.0 bundles TALA; no separate layout-engine installation is needed.

## Serve

```sh
python3 <skill-directory>/scripts/cli.py --walkthrough <walkthrough-directory> --port 8765
```

Serving performs the same validation and HTTP checks before printing the viewer URL, content URL, SVG URL, reload URL, and artifact directory. A separate `--check` immediately before serving is unnecessary if nothing changed. Return the printed viewer URL and artifact directory. Use `--port 0` to choose an available port automatically and preserve existing viewers. Use Ctrl+C to stop the server.

For an initialized walkthrough, replace `--walkthrough <walkthrough-directory>` with `--repo <checkout> --name <workflow>`. Existing folders outside the checkout remain accessible through `--walkthrough`.

The server serves the bundled interface and files within the selected walkthrough folder. It recompiles changed D2 source and reloads changes to the web files and content. The shared interface preserves progress across refreshes. Its behavior is defined in [the authoring guidance](authoring.md#use-the-shared-interface).

Keep source repositories and unrelated walkthroughs outside the serving routes. Run the interface from the installed skill rather than copying it into the product repository. The runtime does not upload files or start a public deployment.
