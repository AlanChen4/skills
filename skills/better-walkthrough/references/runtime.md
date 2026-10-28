# Run a walkthrough

Resolve `<skill-directory>` to the installed folder containing SKILL.md. Commands work independently of the current working directory. The launcher uses assets/web/ and assets/d2/ from that installation.

## Compile and validate

Create a [local walkthrough folder](workspaces.md) and write its [content and diagram source](content-format.md), then run:

```sh
python3 <skill-directory>/scripts/cli.py --walkthrough <walkthrough-directory> --check
```

This command checks dependencies, compiles D2, validates navigation and diagram references, checks person-shape proportions, and checks viewer HTTP routes. Its temporary local server stops before the command exits.

Add `--json` for a machine-readable report (check only). Use `--help` for examples and exit codes.

Compilation writes diagram.svg beside content.js and diagram.d2. The proportion check covers standard D2 person shapes, not arbitrary icons.

These checks do not certify business accuracy, browser execution, or the absence of visual collisions. Browser review is not required.

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

This prints installation guidance without installing software.

## Serve

```sh
python3 <skill-directory>/scripts/cli.py --walkthrough <walkthrough-directory> --port 8765
```

Serving performs the same validation and HTTP checks before printing the viewer URL, content URL, SVG URL, reload URL, and artifact directory. A separate `--check` immediately before serving is unnecessary if nothing changed. Return the printed viewer URL and artifact directory. Use `--port 0` to choose an available port automatically and preserve existing viewers. Use Ctrl+C to stop the server.

For an initialized walkthrough, replace `--walkthrough <walkthrough-directory>` with `--repo <checkout> --name <workflow>`. Existing folders outside the checkout remain accessible through `--walkthrough`.

The server reloads changed source and content. The bundled interface provides manual navigation, branching, exploration tracking, stable diagram positions, pan and zoom, and saved progress.
