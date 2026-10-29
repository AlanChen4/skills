import {readFile} from 'node:fs/promises';
import {resolve as pathResolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {validate} from './model.js';
import {diagramIds, diagramLabels} from '../d2/diagram.js';
import {validateGeometry} from '../d2/geometry.js';
import {resolveConnections, bindChoiceLabels} from '../d2/connections.js';

if (!process.argv[2]) {
  console.error('Usage: node validate.js /path/to/walkthrough/content.js');
  process.exit(1);
}
const path = pathToFileURL(pathResolve(process.argv[2]));
const {default: rawContent} = await import(path.href);
let content = rawContent;
const svg = await readFile(new URL(content.diagram, path), 'utf8');
const ids = diagramIds(svg);
let errors;
try {
  content = bindChoiceLabels(resolveConnections(content, ids), diagramLabels(svg));
  errors = [...validate(content, ids), ...validateGeometry(svg)];
} catch (error) {
  errors = [error.message];
}
if (errors.length) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  const result = {id: content.id, steps: content.steps.length, connections: content.edges.length, diagram: content.diagram};
  console.log(process.argv.includes('--json') ? JSON.stringify(result) : `${result.id}: ${result.steps} steps and ${result.connections} diagram connections validated.`);
}
