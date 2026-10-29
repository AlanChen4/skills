# Run a walkthrough

Resolve `<skill-directory>` to the installed folder containing SKILL.md. Commands work independently of the current working directory. The launcher uses assets/web/ (including its d2/ modules) from that installation.

## Compile and validate

Create a [local walkthrough folder](workspaces.md) and write its [content and diagram source](content-format.md), then run:

```sh
python3 <skill-directory>/scripts/cli.py --walkthrough <walkthrough-directory> --check
```

This command checks dependencies, compiles D2, validates navigation and diagram references, checks person-shape proportions and overall diagram proportions, and checks viewer HTTP routes. Its temporary local server stops before the command exits.

Add `--json` for a machine-readable report (check only). Use `--help` for examples and exit codes.

Compilation writes diagram.svg beside content.js and diagram.d2. The proportion check covers standard D2 person shapes, not arbitrary icons. Overall SVG dimensions come from the root `viewBox`: when the shorter side is at least 1,000 units, the longer side must be at most five times it.

These checks do not certify business accuracy, browser execution, or the absence of visual collisions. Browser review is not required.

## Runtime security boundaries

The launcher executes Git, Node.js, and D2 through one allowlisted helper, using argument lists, timeouts, and no shell. These processes are required for checkout discovery, validation, and diagram compilation. Only open trusted local walkthroughs: Node.js and the browser execute content.js, and D2 resolves diagram imports.

Browser fetches use the viewer's origin and reject redirects. The HTTP handler confines resolved file paths to the bundled assets or selected walkthrough, including symlink targets. Serving binds to all interfaces to support remote preview environments; use it on a trusted network and stop it when finished.

D2 encodes SVG group identifiers; the viewer decodes them as data to match nodes and connections. Numeric SVG text entities are also decoded as text. Neither decoder evaluates the result as code. Static scanners may flag these decoders, local HTTP requests, or process launches even though the runtime needs them. Review the actual call sites when assessing such findings.

## Diagnose dependencies

Use Python 3.9 or newer, a current Node.js LTS release, and D2 0.9.0 or newer with bundled TALA. No npm or pip packages are required by the runtime. The CLI always compiles with TALA and downward flow, overriding layout settings in the source or environment. There is no layout parameter. All diagram text uses 24px regular type, with bold and italic disabled before layout.

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

The server reloads changed source and content. The bundled interface provides manual navigation, branching, exploration tracking, stable diagram positions, and saved progress.

- The panel floats over the full-width diagram. It can be minimized or restored, and its state survives refresh.
- Next, Back, and choices focus the active node with a 600 ms ease-out transition. Reduced-motion preferences disable animation.
- With Toggle All off, connected edge labels move near the active node and stay within the focus view. Toggle All restores their original positions.
- Drag to pan. Scroll over the diagram to zoom around the pointer, up to 500%. The camera transforms an outer HTML layer, keeping the SVG and its dimensions unchanged.
- Wheel input updates on the next animation frame. Camera position saves after interaction settles and restores on refresh.
- Native diagram scrollbars are hidden. Thin position indicators fade in during mouse dragging and fade out on release.
