import {readFile} from 'node:fs/promises';
import {resolve as pathResolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {validate} from './model.js';
import {diagramIds} from '../d2/diagram.js';

if (!process.argv[2]) {
  console.error('Usage: node validate.js /path/to/walkthrough/content.js');
  process.exit(1);
}
const path = pathToFileURL(pathResolve(process.argv[2]));
const {default: content} = await import(path.href);
const svg = await readFile(new URL(content.diagram, path), 'utf8');
const errors = validate(content, diagramIds(svg));
if (errors.length) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(`${content.id}: ${content.steps.length} steps and ${content.edges.length} diagram connections validated.`);
}
