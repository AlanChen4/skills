import {build} from 'esbuild';
import {readFile, writeFile, mkdtemp, rename, rm} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

// Called only after the CLI has compiled and validated these sources.
const [contentPath, svgPath, outputPath] = process.argv.slice(2).map(path => resolve(path));
const web = fileURLToPath(new URL('../assets/web/', import.meta.url));
const svgText = await readFile(svgPath, 'utf8');
const result = await build({
  stdin: {
    contents: `import content from ${JSON.stringify(contentPath)};
import {startViewer} from ${JSON.stringify(join(web, 'index.js'))};
startViewer(content, ${JSON.stringify(svgText)});`,
    resolveDir: dirname(contentPath),
    sourcefile: 'walkthrough-entry.js',
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  metafile: true,
  supported: {'inline-script': true},
});
if (Object.values(result.metafile.outputs).some(output => output.imports.length)) {
  throw new Error('The standalone viewer must not import external modules.');
}
const css = await readFile(join(web, 'styles.css'), 'utf8');
const template = await readFile(join(web, 'index.html'), 'utf8');
const html = template
  .replace('<link rel="stylesheet" href="/web/styles.css">', () => `<style>${css}</style>`)
  .replace('<script type="module" src="/web/dev.js"></script>', () => `<script type="module">${result.outputFiles[0].text}</script>`);

// Replace only a complete bundle, on the same filesystem as its destination.
const temporary = await mkdtemp(join(dirname(outputPath), '.build-'));
try {
  const staged = join(temporary, 'index.html');
  await writeFile(staged, html);
  await rename(staged, outputPath);
} finally {
  await rm(temporary, {recursive: true, force: true});
}
