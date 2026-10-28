import {decodeId} from './diagram.js';

// D2's person outline is 68.3 by 77.4 before layout scaling.
// https://github.com/terrastruct/d2/blob/v0.9.0/lib/shape/shape_person.go
const personCommands = 'MHVCCCCCCVHZ';
const personRatio = 68.3 / 77.4;

export function validateGeometry(svg) {
  const errors = [];
  const groups = [];
  for (const match of svg.matchAll(/<g\b[^>]*>|<\/g\s*>|<path\b[^>]*>/g)) {
    const tag = match[0];
    if (tag.startsWith('</g')) { groups.pop(); continue; }
    if (tag.startsWith('<g')) {
      groups.push(decodeId(tag.match(/\bclass="([^"]*)"/)?.[1] || '') || groups.at(-1));
      continue;
    }
    const path = tag.match(/\bd="([^"]*)"/)?.[1] || '';
    const commands = [...path.matchAll(/[a-df-z]/gi)].map(match => match[0]).join('');
    if (commands !== personCommands) continue;
    const segments = [...path.matchAll(/([MHVCZ])([^MHVCZ]*)/g)];
    const numbers = segment => (segment.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi) || []).map(Number);
    const start = numbers(segments[0][2]);
    const left = numbers(segments[1][2])[0];
    const ys = segments.filter(segment => segment[1] === 'C').flatMap(segment => numbers(segment[2]).filter((_, index) => index % 2));
    const width = start[0] - left;
    const height = start[1] - Math.min(...ys);
    const ratio = width / height;
    // Allow rounding and modest design variation, but reject over 20% distortion.
    if (!(width > 0 && height > 0) || ratio < personRatio / 1.2 || ratio > personRatio * 1.2) {
      errors.push(`Person shape ${groups.at(-1) || '(unknown node)'} is distorted (${width} × ${height}). Use similar width and height (e.g. 96 × 108) and put the label outside the shape.`);
    }
  }
  return errors;
}
