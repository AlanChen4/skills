"""Compile, validate, or serve a walkthrough folder with the bundled web interface."""
import argparse
from hashlib import sha256
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock
import json
import subprocess
import shutil
import sys
import tempfile
from urllib.parse import unquote, urlsplit
sys.dont_write_bytecode = True
from workspace import initialize, workspace_path

ROOT = Path(__file__).resolve().parents[1] / 'assets'
render_lock = Lock()
rendered_source = None


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
        if self.path.split('?', 1)[0] != '/__version' or code != 200:
            super().log_request(code, size)


def main(argv=None):
    global example, svg, rendered_source, layout
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--walkthrough', type=Path, help='Folder containing content.js and diagram.d2')
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--check', action='store_true', help='Compile and validate, then exit')
    parser.add_argument('--doctor', action='store_true', help='Check dependencies and optionally compile a walkthrough without changing its files')
    parser.add_argument('--setup', action='store_true', help='Print dependency installation instructions')
    parser.add_argument('--layout', help='Override the diagram layout engine (see d2 layout)')
    parser.add_argument('--init', action='store_true', help='Create an external workspace and source manifest; print its path')
    parser.add_argument('--repo', type=Path, help='Source checkout (required with --init)')
    parser.add_argument('--name', help='Workflow name used to locate its external workspace')
    parser.add_argument('--output-root', type=Path, help='Override the external data directory')
    args = parser.parse_args(argv)
    if args.init:
        if not args.repo or not args.name or args.walkthrough or args.check or args.doctor or args.setup:
            parser.error('--init requires --repo and --name, without --walkthrough, --check, --doctor, or --setup')
        try:
            print(initialize(args.repo, args.name, args.output_root))
        except (OSError, ValueError) as error:
            parser.exit(1, f'{error}\n')
        return
    if args.repo or args.name or args.output_root:
        if not args.repo or not args.name or args.walkthrough:
            parser.error('Use --repo and --name together, or use --walkthrough')
        try:
            _, args.walkthrough = workspace_path(args.repo, args.name, args.output_root)
        except ValueError as error:
            parser.exit(1, f'{error}\n')
    layout = args.layout
    if args.setup:
        print(SETUP)
        return
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
        print(run_checked(['node', str(ROOT / 'web/validate.js'), str(example / 'content.js')]))
    except RuntimeError as error:
        parser.exit(1, f'{error}\nCheck the diagram and content. Run --doctor --walkthrough <folder> to check its layout engine.\n')
    if not args.check:
        print(f'Walkthrough: http://localhost:{args.port}/', flush=True)
        ThreadingHTTPServer(('0.0.0.0', args.port), Handler).serve_forever()


if __name__ == '__main__':
    main()
