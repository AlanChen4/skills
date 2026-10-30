# Run a walkthrough

- Set `<skill-directory>` to the installed folder containing SKILL.md.
- Commands work from any directory and use the installation's assets/web/ files.
- Use `--walkthrough <folder>` or `--repo <checkout> --name <workflow>` to select a walkthrough.

## Build standalone HTML

```sh
python3 <skill-directory>/scripts/cli.py --walkthrough <folder> --build
```

- Build is the default action. It compiles D2, validates content and diagram references, and bundles the viewer, CSS, content functions, and SVG into index.html.
- The command exits without starting a server. Open index.html directly in a browser; viewing needs no tools or network access.
- Edit content.js and diagram.d2, then rebuild. The build atomically replaces index.html at the same path after success. Failed validation or bundling preserves the previous HTML.
- Refresh an open file after rebuilding. For incompatible scenario changes, change `storageKey` as described in [content-format.md](content-format.md).
- Local-file storage varies by browser. Navigation works when storage is unavailable.
- Follow the delivery rules in [SKILL.md](../SKILL.md), including after development serving.

## Dependencies

- Python 3.9 or newer, a current Node.js LTS release, and D2 0.9.0 or newer with bundled TALA.
- Put node and d2 on PATH. No pip packages are required.
- Install esbuild once for standalone builds: `npm ci --prefix <skill-directory>`. Serving and validation do not need it.
- Compilation always uses TALA and downward flow, overriding source and environment settings. Text uses 24px regular type; bold and italic are disabled before layout.

When dependencies fail:

```sh
python3 <skill-directory>/scripts/cli.py --doctor
```

- This probes Node.js features and compiles a temporary diagram with TALA.
- Add `--walkthrough <folder>` to check an existing diagram without changing its files.
- Use `--setup` to print installation guidance without installing software.

## Compile and validate

```sh
python3 <skill-directory>/scripts/cli.py --walkthrough <folder> --check
```

- Checks dependencies, navigation, diagram references, person proportions, overall proportions, and viewer HTTP routes.
- Writes diagram.svg beside the sources. Its temporary server stops before exit.
- Add `--json` for a machine-readable report. Use `--help` for examples and exit codes.
- Person checks cover standard D2 person shapes. For a root SVG `viewBox` with a shorter side of at least 1,000 units, the longer side must be at most five times it.
- Checks do not establish business accuracy, browser execution, or freedom from visual collisions. Browser review is optional.

## Serve during development

```sh
python3 <skill-directory>/scripts/cli.py --walkthrough <folder> --serve --port 8765
```

- Serving validates and checks HTTP routes before printing the viewer, content, SVG, and reload URLs and artifact directory. A separate `--check` is unnecessary when files are unchanged.
- Source edits reload the viewer. Serving does not rebuild index.html; run `--build` after the final edits.
- Use `--port 0` to choose an available port and preserve existing viewers. Stop with Ctrl+C.

## Viewer controls

- Next, Back, and choices focus the active node. The 600 ms ease-out animation respects reduced-motion preferences.
- Minimize or restore the floating panel. Its state survives refresh.
- Toggle All restores original edge-label positions. With it off, connected labels stay near the active node.
- Drag to pan; scroll to zoom around the pointer, up to 500%. Camera changes apply to an outer HTML layer and preserve SVG dimensions.
- Wheel updates run on the next animation frame. Camera position saves after interaction settles and restores on refresh.
- Scrollbars stay hidden. Position indicators appear during dragging and fade on release.

## Runtime boundaries

- Open trusted local walkthroughs only. Node.js and the browser execute content.js; D2 resolves imports.
- The launcher runs Git, Node.js, and D2 through an allowlisted helper with argument lists, timeouts, and no shell.
- Development fetches stay on the viewer origin and reject redirects. The HTTP handler confines files and symlink targets to the assets or selected walkthrough.
- Serving binds to all interfaces for remote previews. Use a trusted network and stop it when finished.
- SVG identifier and numeric-text decoders treat their results as data. If scanners flag decoders, local requests, or process launches, inspect their call sites.
