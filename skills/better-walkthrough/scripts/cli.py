"""Compile, validate, or serve a walkthrough folder with the bundled web interface."""
import argparse
from hashlib import sha256
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock, Thread
import json
import os
import re
import subprocess
import shutil
import sys
import tempfile
from urllib.parse import unquote, urlsplit, urljoin
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1] / 'assets'
render_lock = Lock()
rendered_source = None


def workspace_path(repo, name):
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,63}', name):
        raise ValueError('Use a workflow name of up to 64 lowercase letters, digits, or hyphens.')
    repo = repo.expanduser().resolve()
    if not repo.is_dir():
        raise ValueError('The source repository must be an existing directory.')
    try:
        result = subprocess.run(['git', '-C', str(repo), 'rev-parse', '--show-toplevel'],
            capture_output=True, text=True, timeout=5, env={**os.environ, 'GIT_OPTIONAL_LOCKS': '0'})
        if result.returncode == 0:
            repo = Path(result.stdout.strip()).resolve()
    except (OSError, subprocess.TimeoutExpired):
        pass  # Directories without Git use the supplied root.
    root = repo / '.better-walkthrough'
    folder = root / name
    if root.is_symlink() or folder.is_symlink():
        raise ValueError('The walkthrough directory must not be a symbolic link.')
    return root, folder


def initialize(repo, name):
    root, folder = workspace_path(repo, name)
    try:
        tracked = subprocess.run(['git', '-C', str(root.parent), 'ls-files', '--', '.better-walkthrough'],
            capture_output=True, text=True, timeout=5, env={**os.environ, 'GIT_OPTIONAL_LOCKS': '0'})
        if tracked.returncode == 0 and tracked.stdout.strip():
            raise ValueError('.better-walkthrough contains tracked files. Choose a checkout without tracked walkthrough artifacts.')
    except (OSError, subprocess.TimeoutExpired):
        pass
    root.mkdir(exist_ok=True)
    ignore = root / '.gitignore'
    if ignore.is_symlink():
        raise ValueError('The walkthrough .gitignore must not be a symbolic link.')
    text = ignore.read_text(encoding='utf-8') if ignore.exists() else ''
    if not text.splitlines() or text.splitlines()[-1].strip() != '*':
        ignore.write_text(text + ('\n' if text and not text.endswith('\n') else '') + '*\n', encoding='utf-8')
    folder.mkdir(exist_ok=True)
    return folder


SETUP = """Install the dependencies, then rerun --doctor:
- Python 3.9 or newer: https://www.python.org/downloads/
- A current Node.js LTS release: https://nodejs.org/en/download
- D2: https://d2lang.com/tour/install/
Put node and d2 on PATH. No npm or pip packages are required.
Run d2 layout to list engines available in your installation.
A diagram's layout-engine setting selects its engine unless --layout overrides it.
"""


def run_checked(command, **kwargs):
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=30, **kwargs)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise RuntimeError(f'Could not run {command[0]}: {error}') from error
    if result.returncode:
        detail = (result.stderr or result.stdout).strip()
        raise RuntimeError(f'{command[0]} failed: {detail}')
    return result.stdout.strip()


def check_dependencies():
    if sys.version_info < (3, 9):
        raise RuntimeError('Python 3.9 or newer is required.')
    missing = [name for name in ['node', 'd2'] if not shutil.which(name)]
    if missing:
        raise RuntimeError('Missing executables on PATH: ' + ', '.join(missing))
    node_version = run_checked(['node', '--version'])
    d2_version = run_checked(['d2', '--version'])
    # Check the features actually used, including .js module syntax detection.
    with tempfile.TemporaryDirectory(prefix='better-walkthrough-dependencies-') as folder:
        probe = Path(folder) / 'probe.js'
        probe.write_text("export {}; if (!Object.hasOwn({a: 1}, 'a') || atob('YQ==') !== 'a' || [1].at(-1) !== 1) process.exit(1);", encoding='utf-8')
        try:
            run_checked(['node', str(probe)])
        except RuntimeError as error:
            raise RuntimeError('Node.js cannot run the required JavaScript features. Install a current LTS release.\n' + str(error)) from error
    return f'Python {sys.version.split()[0]}; Node.js {node_version}; D2 {d2_version}'


def compile_diagram(source, output):
    command = ['d2', '--pad=24']
    if layout:
        command.extend(['--layout', layout])
    command.extend([str(source), str(output)])
    run_checked(command)


def refresh_diagram():
    global rendered_source
    with render_lock:
        # Include shared D2 imports when checking for changes.
        digest = sha256()
        for path in sorted([*example.rglob('*.d2'), *(ROOT / 'd2').rglob('*.d2')]):
            digest.update(str(path).encode())
            digest.update(path.read_bytes())
        source = digest.digest()
        if source != rendered_source or not svg.exists():
            compile_diagram(example / 'diagram.d2', svg)
            rendered_source = source


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def translate_path(self, path):
        route = unquote(urlsplit(path).path)
        for prefix, folder in [('/web/', ROOT / 'web'), ('/d2/', ROOT / 'd2'), ('/walkthrough/', example)]:
            if route.startswith(prefix):
                candidate = (folder / route[len(prefix):]).resolve()
                if candidate.is_relative_to(folder.resolve()) and candidate.is_file():
                    return str(candidate)
        return str(ROOT / '__not_found__')

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def json_response(self, value):
        body = json.dumps(value).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        route = self.path.split('?', 1)[0]
        if route == '/':
            self.path = '/web/index.html'
        if route == '/__config':
            return self.json_response({'content': '/walkthrough/content.js'})
        if route != '/__version':
            return super().do_GET()
        try:
            refresh_diagram()
            digest = sha256()
            for folder in [ROOT / 'web', ROOT / 'd2', example]:
                for path in sorted(folder.rglob('*')):
                    if path.is_file() and path.suffix in {'.html', '.js', '.css', '.d2', '.svg'}:
                        digest.update(str(path).encode())
                        digest.update(path.read_bytes())
            self.json_response({'revision': digest.hexdigest()})
        except (OSError, RuntimeError):
            self.send_error(500, 'Could not compile the diagram')

    def log_request(self, code='-', size='-'):
        if not quiet_requests and (self.path.split('?', 1)[0] != '/__version' or code != 200):
            super().log_request(code, size)


def smoke_check(base, diagram):
    """Check the viewer's real routes without running a browser or product code."""
    def read(route):
        with urlopen(urljoin(base, route), timeout=5) as response:
            if response.status != 200:
                raise RuntimeError(f'Viewer check failed: {route} returned {response.status}')
            return response.read()
    config = json.loads(read('/__config'))
    content_route = config['content']
    diagram_route = urljoin(content_route, diagram)
    if not content_route.startswith('/walkthrough/') or not diagram_route.startswith('/walkthrough/'):
        raise RuntimeError('Viewer content and diagram must use /walkthrough/ routes.')
    expected = {'/': (ROOT / 'web/index.html').read_bytes(), content_route: (example / 'content.js').read_bytes(),
                diagram_route: (example / unquote(diagram_route.removeprefix('/walkthrough/'))).read_bytes()}
    # Required viewer dependencies, including files whose absence must fail the check.
    for relative in ['web/index.js', 'web/model.js', 'web/viewport.js', 'web/styles.css', 'd2/diagram.js', 'd2/connections.js']:
        expected['/' + relative] = (ROOT / relative).read_bytes()
    for route, body in expected.items():
        if read(route) != body:
            raise RuntimeError(f'Viewer check failed: incorrect response at {route}')
    if not json.loads(read('/__version')).get('revision'):
        raise RuntimeError('Viewer check failed: missing reload revision.')
    return {'routes': len(expected) + 2, 'content': content_route, 'diagram': diagram_route}


def main(argv=None):
    global example, svg, rendered_source, layout, quiet_requests
    quiet_requests = True
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''Examples:
  python3 %(prog)s --init --repo /path/to/repo --name onboarding
  python3 %(prog)s --walkthrough /path/to/walkthrough --check
  python3 %(prog)s --walkthrough /path/to/walkthrough --check --json
  python3 %(prog)s --walkthrough /path/to/walkthrough --port 0

Exit codes: 0 success; 1 check or runtime failure; 2 invalid arguments.
--check compiles, validates, and checks HTTP routes using a temporary local server.
Serving performs the same checks before printing the viewer URL. Use port 0 to
select an available port automatically. No additional validator or HTTP calls are needed.''')
    parser.add_argument('--walkthrough', type=Path, help='Folder containing content.js and diagram.d2')
    parser.add_argument('--port', type=int, default=8765, help='Viewer port; 0 selects an available port (default: 8765)')
    parser.add_argument('--check', action='store_true', help='Compile, validate, smoke-check HTTP routes, then exit')
    parser.add_argument('--json', action='store_true', help='Print a machine-readable report (requires --check)')
    parser.add_argument('--doctor', action='store_true', help='Check dependencies and optionally compile a walkthrough without changing its files')
    parser.add_argument('--setup', action='store_true', help='Print dependency installation instructions')
    parser.add_argument('--layout', help='Override the diagram layout engine (see d2 layout)')
    parser.add_argument('--init', action='store_true', help='Create .better-walkthrough/<name> with a self-ignoring .gitignore; print its path')
    parser.add_argument('--repo', type=Path, help='Source checkout (required with --init)')
    parser.add_argument('--name', help='Workflow name inside .better-walkthrough/')
    args = parser.parse_args(argv)
    if not 0 <= args.port <= 65535:
        parser.error('--port must be between 0 and 65535. Example: --walkthrough /path/to/walkthrough --port 0')
    if args.json and (not args.check or args.init or args.doctor or args.setup):
        parser.error('--json requires --check. Example: --walkthrough /path/to/walkthrough --check --json')
    if sum([args.init, args.check, args.doctor, args.setup]) > 1:
        parser.error('Choose one action: --init, --check, --doctor, or --setup. Example: --walkthrough /path/to/walkthrough --check')
    if args.init:
        if not args.repo or not args.name or args.walkthrough or args.check or args.doctor or args.setup:
            parser.error('--init requires --repo and --name, without --walkthrough, --check, --doctor, or --setup')
        try:
            print(initialize(args.repo, args.name))
        except (OSError, ValueError) as error:
            parser.exit(1, f'{error}\n')
        return
    if args.repo or args.name:
        if not args.repo or not args.name or args.walkthrough:
            parser.error('Use --repo and --name together, or use --walkthrough')
        try:
            _, args.walkthrough = workspace_path(args.repo, args.name)
        except ValueError as error:
            parser.exit(1, f'{error}\n')
    layout = args.layout
    if args.setup:
        print(SETUP)
        return
    if not args.walkthrough and not args.doctor:
        parser.error('Choose a walkthrough. Example: --walkthrough /path/to/walkthrough --check')
    try:
        versions = check_dependencies()
    except RuntimeError as error:
        parser.exit(1, f'{error}\nRun this launcher with --setup for installation instructions.\n')
    if args.doctor:
        print(versions)
        try:
            with tempfile.TemporaryDirectory(prefix='better-walkthrough-layout-') as folder:
                source = args.walkthrough.expanduser().resolve() / 'diagram.d2' if args.walkthrough else Path(folder) / 'probe.d2'
                if not args.walkthrough:
                    source.write_text('start -> finish\n', encoding='utf-8')
                compile_diagram(source, Path(folder) / 'probe.svg')
        except RuntimeError as error:
            parser.exit(1, f'{error}\nRun d2 layout to check available engines, or use --layout to choose one.\n')
        print('Dependency and layout checks passed.')
        return
    if not args.walkthrough:
        parser.error('--walkthrough is required unless --doctor or --setup is used')
    example = args.walkthrough.expanduser().resolve()
    if not all((example / name).is_file() for name in ['content.js', 'diagram.d2']):
        parser.error('Choose a walkthrough folder containing content.js and diagram.d2')
    svg = example / 'diagram.svg'
    rendered_source = None
    try:
        refresh_diagram()
        report = json.loads(run_checked(['node', str(ROOT / 'web/validate.js'), str(example / 'content.js'), '--json']))
        server = ThreadingHTTPServer(('127.0.0.1' if args.check else '0.0.0.0', 0 if args.check else args.port), Handler)
    except (OSError, RuntimeError) as error:
        parser.exit(1, f'{error}\nCheck the diagram and content. Run --doctor --walkthrough <folder> to check its layout engine.\n')
    worker = Thread(target=server.serve_forever, daemon=True)
    worker.start()
    base = f'http://localhost:{server.server_port}/'
    try:
        viewer = smoke_check(base, report['diagram'])
        report.update({'ok': True, 'artifacts': str(example), 'viewer': viewer})
        if args.check:
            print(json.dumps(report) if args.json else f"{report['id']}: {report['steps']} steps, {report['connections']} connections; {viewer['routes']} viewer routes checked.\nArtifacts: {example}")
        else:
            quiet_requests = False
            print(f"Validated: {report['steps']} steps, {report['connections']} connections; {viewer['routes']} viewer routes checked.\nWalkthrough: {base}\nContent: {urljoin(base, viewer['content'])}\nDiagram: {urljoin(base, viewer['diagram'])}\nReload: {urljoin(base, '/__version')}\nArtifacts: {example}", flush=True)
            worker.join()
    except (OSError, RuntimeError, ValueError, KeyError) as error:
        parser.exit(1, f'Viewer check failed: {error}\nRerun --walkthrough {example} --check for diagnostics.\n')
    except KeyboardInterrupt:
        pass
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
