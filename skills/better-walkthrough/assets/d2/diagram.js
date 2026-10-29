import {resolveConnections, bindChoiceLabels} from './connections.js';

// D2 SVG groups encode their source IDs in the first CSS class.
export function decodeId(className) {
  try { return atob(className.split(' ')[0]).replaceAll('&gt;', '>').replaceAll('&lt;', '<').replaceAll('&amp;', '&'); } catch { return null; }
}
export function diagramIds(svgText) {
  const ids = new Set();
  for (const match of svgText.matchAll(/<g\b[^>]*\bclass="([^"]+)"/g)) {
    const id = decodeId(match[1]);
    if (id) ids.add(id);
  }
  return ids;
}
// D2 places connection text inside its encoded connection group.
export function diagramLabels(svgText) {
  const labels = new Map();
  const decodeText = value => value.replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_, code) => String.fromCodePoint(code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code)))
    .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&amp;', '&');
  for (const match of svgText.matchAll(/<g\b[^>]*\bclass="([^"]+)"[^>]*>/g)) {
    const id = decodeId(match[1]);
    if (!id || !/\)\[\d+\]$/.test(id)) continue;
    const end = svgText.indexOf('</g>', match.index + match[0].length);
    const body = svgText.slice(match.index + match[0].length, end);
    const text = [...body.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)]
      .map(part => decodeText(part[1].replace(/<\/tspan>/g, ' ').replace(/<[^>]*>/g, ''))).join(' ').replace(/\s+/g, ' ').trim();
    labels.set(id, text);
  }
  return labels;
}
export async function loadDiagram(url, container, content) {
  const response = await fetch(url, {cache: 'no-store'});
  if (!response.ok) throw new Error('Diagram loading failed');
  const text = await response.text();
  const ids = diagramIds(text);
  content = bindChoiceLabels(resolveConnections(content, ids), diagramLabels(text));
  const parsed = new DOMParser().parseFromString(text, 'image/svg+xml');
  if (parsed.querySelector('parsererror')) throw new Error('Invalid diagram');
  const svg = document.importNode(parsed.documentElement, true);
  const [, , width, height] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
  const displayWidth = Math.min(width, container.clientWidth);
  svg.setAttribute('width', displayWidth);
  svg.setAttribute('height', height * displayWidth / width);
  svg.setAttribute('role', 'img');
  const nodes = new Set(content.steps.map(step => step.highlight));
  const providers = new Set([...nodes].flatMap(node => {
    const parts = node.split('.');
    return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join('.'));
  }));
  const items = [];
  for (const element of svg.querySelectorAll('g[class]')) {
    const id = decodeId(element.getAttribute('class'));
    const edgeIndex = content.edges.indexOf(id);
    const isProvider = providers.has(id);
    const hasShape = Boolean(element.querySelector(':scope > .shape'));
    const isNode = hasShape && !isProvider;
    if (!id || (!hasShape && !element.querySelector(':scope > path.connection'))) continue;
    const shapes = [...element.querySelectorAll(':scope > .shape > *')].map(shape => ({shape, originalStyle: shape.getAttribute('style') || ''}));
    items.push({element, id, edgeIndex, isNode, isProvider, shapes});
    element.style.opacity = '0';
    element.style.pointerEvents = 'none';
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) element.style.transition = 'opacity 200ms';
  }
  // Reuse D2's edge masks so clearance stays transparent on any background.
  const masks = new Map([...svg.querySelectorAll('mask[id]')].map(mask => [mask.id, mask]));
  const edgeMasks = new Set([...svg.querySelectorAll('path.connection')].map(path => {
    const id = path.getAttribute('mask')?.match(/^url\(#(.+)\)$/)?.[1];
    return masks.get(id);
  }).filter(Boolean));
  container.replaceChildren(svg);
  return {
    ids,
    content,
    draw(state, current, title, showAll = false, previewEdges = []) {
      svg.setAttribute('aria-label', title);
      svg.querySelectorAll('.choice-label-clearance').forEach(rect => rect.remove());
      for (const {element, id, edgeIndex, isNode, isProvider, shapes} of items) {
        const upcoming = edgeIndex >= 0 && previewEdges.some(choice => choice.edge === edgeIndex);
        const visible = showAll || upcoming || (isProvider ? state.nodes.some(node => node.startsWith(id + '.')) : isNode ? state.nodes.includes(id) : state.edges.includes(edgeIndex));
        const active = isProvider ? current.startsWith(id + '.') : isNode ? current === id : edgeIndex === state.activeEdge;
        element.style.opacity = visible ? (showAll || active || upcoming ? '1' : '0.3') : '0';
        element.style.pointerEvents = visible ? 'auto' : 'none';
        element.setAttribute('aria-hidden', String(!visible));
        if (edgeIndex >= 0) {
          element.querySelector('.choice-edge-preview')?.remove();
          if (upcoming) {
            const label = element.querySelector('text');
            const path = element.querySelector('path.connection');
            const box = label?.getBBox();
            const point = box ? {x: box.x, y: box.y + box.height / 2} : path?.getPointAtLength(path.getTotalLength() / 2);
            if (point) {
              if (box) for (const mask of edgeMasks) mask.append(svgElement('rect', {
                class: 'choice-label-clearance', x: box.x - 18, y: box.y - 4,
                width: box.width + 22, height: box.height + 8, fill: 'black',
              }));
              const group = svgElement('g', {class: 'choice-edge-preview'});
              group.append(svgElement('circle', {class: 'choice-edge-marker', cx: point.x - 10, cy: point.y,
                r: 4, fill: previewEdges.find(choice => choice.edge === edgeIndex).color, 'aria-hidden': true}));
              element.append(group);
            }
          }
        }
        for (const {shape, originalStyle} of shapes) {
          shape.setAttribute('style', originalStyle);
          if (isNode && active) { shape.style.fill = '#FFE29A'; shape.style.strokeWidth = '4'; }
        }
      }

    },
  };
}

function svgElement(tag, attributes) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}
