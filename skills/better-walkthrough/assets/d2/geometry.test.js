import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {validateGeometry} from './geometry.js';

test('compiled person proportions reject wide and tall silhouettes, with node IDs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'walkthrough-geometry-'));
  try {
    for (const engine of ['dagre', 'elk']) {
      for (const [width, height, rejected] of [[96, 108, false], [240, 108, true], [96, 240, true]]) {
        const source = join(directory, 'diagram.d2');
        const output = join(directory, 'diagram.svg');
        await writeFile(source, `staff: {\n person: Review {shape: person; width: ${width}; height: ${height}; label.near: outside-bottom-center}\n}\nwide: Process {width: 300; height: 50}\n`);
        execFileSync('d2', ['--layout', engine, source, output], {stdio: 'pipe'});
        const errors = validateGeometry(await readFile(output, 'utf8'));
        assert.equal(errors.length, rejected ? 1 : 0, `${engine}: ${width} × ${height}`);
        if (rejected) assert.match(errors[0], /staff\.person.*distorted/);
      }
    }
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});
