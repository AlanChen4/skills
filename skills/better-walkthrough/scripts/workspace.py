"""Locate external walkthrough data and record the source checkout without modifying it."""
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
import json
import os
import re
import subprocess
import sys


def git_value(repo, *args):
    try:
        result = subprocess.run(['git', '-C', str(repo), *args], capture_output=True,
                                text=True, timeout=15, env={**os.environ, 'GIT_OPTIONAL_LOCKS': '0'})
    except (OSError, subprocess.TimeoutExpired):
        return None
    return result.stdout.strip() if result.returncode == 0 else None


def data_directory():
    override = os.environ.get('BETTER_WALKTHROUGH_HOME')
    if override:
        return Path(override).expanduser().resolve()
    if sys.platform == 'win32':
        base = Path(os.environ.get('LOCALAPPDATA', Path.home() / 'AppData' / 'Local'))
    elif sys.platform == 'darwin':
        base = Path.home() / 'Library' / 'Application Support'
    else:
        configured = os.environ.get('XDG_DATA_HOME', '')
        base = Path(configured) if configured and Path(configured).is_absolute() else Path.home() / '.local' / 'share'
    return (base / 'better-walkthrough').resolve()


def workspace_path(repo, name, output_root=None):
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,63}', name):
        raise ValueError('Use a workflow name of up to 64 lowercase letters, digits, or hyphens.')
    repo = repo.expanduser().resolve()
    if not repo.is_dir():
        raise ValueError('The source repository must be an existing directory.')
    git_root = git_value(repo, 'rev-parse', '--show-toplevel')
    repo = Path(git_root).resolve() if git_root else repo
    root = output_root.expanduser().resolve() if output_root else data_directory()
    label = re.sub(r'[^a-zA-Z0-9_-]+', '-', repo.name).strip('-')[:48] or 'repository'
    key = sha256(str(repo).encode()).hexdigest()[:12]
    folder = (root / f'{label}-{key}' / name).resolve()
    if folder.is_relative_to(repo) or root.is_relative_to(repo):
        raise ValueError('Choose an output directory outside the source checkout.')
    return repo, folder


def initialize(repo, name, output_root=None):
    repo, folder = workspace_path(repo, name, output_root)
    folder.mkdir(parents=True, exist_ok=True)
    manifest_path = folder / 'manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}
    now = datetime.now(timezone.utc).isoformat()
    status = git_value(repo, 'status', '--porcelain')
    manifest.update({
        'version': 1,
        'workflow': name,
        'createdAt': manifest.get('createdAt', now),
        'sourceObservedAt': now,
        'source': {
            'root': str(repo),
            'commit': git_value(repo, 'rev-parse', '--verify', 'HEAD'),
            'branch': git_value(repo, 'symbolic-ref', '--quiet', '--short', 'HEAD'),
            'dirty': bool(status) if status is not None else None,
        },
    })
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    return folder
