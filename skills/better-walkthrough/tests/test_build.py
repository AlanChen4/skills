"""Integration checks: python3 -m unittest discover -s skills/better-walkthrough/tests"""
from html.parser import HTMLParser
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


CLI = Path(__file__).resolve().parents[1] / 'scripts/cli.py'


class Tags(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.tags = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


class StandaloneBuild(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='walkthrough build ')
        self.addCleanup(self.temporary.cleanup)
        self.folder = Path(self.temporary.name)
        (self.folder / 'diagram.d2').write_text('start -> finish: Continue\n')
        (self.folder / 'helper.js').write_text('export const label = "Imported helper";\n')
        self.content = '''import {label} from './helper.js';
export default {
  id: 'build-test', title: label, diagram: './diagram.svg', start: 'start',
  initial: {count: 1}, edges: {continue: {from: 'start', to: 'finish'}},
  steps: [
    {id: 'start', highlight: 'start', title: state => `Count ${state.count}`,
     explanation: '</script><script>window.injected = true</script>',
     next: {to: 'finish', edge: 'continue', updates: state => ({count: state.count + 1})}},
    {id: 'finish', highlight: 'finish', title: state => `Count ${state.count}`,
     explanation: 'Finished'},
  ],
};
'''
        self.write_content(self.content)

    def write_content(self, text):
        (self.folder / 'content.js').write_text(text)

    def run_cli(self, *args, success=True):
        result = subprocess.run([sys.executable, str(CLI), '--walkthrough', str(self.folder), *args],
                                capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 0 if success else 1, result.stdout + result.stderr)
        return result

    def test_default_build_and_extend_at_same_path(self):
        self.run_cli()
        output = self.folder / 'index.html'
        original = output.read_text()
        tags = Tags(original).tags
        scripts = [attrs for tag, attrs in tags if tag == 'script']
        self.assertEqual(scripts, [{'type': 'module'}])
        self.assertFalse(any(tag == 'link' and attrs.get('href') for tag, attrs in tags))
        self.assertNotIn('/__version', original)
        self.assertNotIn('import(', original)
        (self.folder / 'diagram.d2').write_text('start -> finish: Continue\nfinish -> added: Extend\n')
        extended = self.content.replace("explanation: 'Finished'", "explanation: 'Finished', next: {to: 'added', edge: 'extend'}")
        extended = extended.replace("edges: {continue:", "edges: {extend: {from: 'finish', to: 'added'}, continue:")
        extended = extended.replace("  ],", "    {id: 'added', highlight: 'added', title: 'Added scenario'},\n  ],")
        self.write_content(extended)
        self.run_cli('--build')
        self.assertNotEqual(output.read_text(), original)
        self.assertIn('Added scenario', output.read_text())
        self.assertIn('Added scenario', (self.folder / 'content.js').read_text())
        self.assertEqual(list(self.folder.glob('.build-*')), [])

    def test_invalid_content_preserves_previous_html(self):
        self.run_cli('--build')
        original = (self.folder / 'index.html').read_bytes()
        self.write_content(self.content.replace("highlight: 'finish'", "highlight: 'missing'"))
        self.run_cli('--build', success=False)
        self.assertEqual((self.folder / 'index.html').read_bytes(), original)

    def test_bundle_failure_preserves_previous_html(self):
        self.run_cli('--build')
        original = (self.folder / 'index.html').read_bytes()
        # Valid in Node validation, but unavailable in a browser bundle.
        self.write_content("import fs from 'node:fs';\n" + self.content)
        self.run_cli('--build', success=False)
        self.assertEqual((self.folder / 'index.html').read_bytes(), original)
        self.assertEqual(list(self.folder.glob('.build-*')), [])


if __name__ == '__main__':
    unittest.main()
