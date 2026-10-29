import {resolveConnections, bindChoiceLabels, connectionEndpoints} from './connections.js';

// D2 SVG groups encode their source IDs in the first CSS class.
// Decode this format as data only; the result is never evaluated as code.
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
  const response = await fetch(url, {cache: 'no-store', mode: 'same-origin', redirect: 'error'});
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
    const label = edgeIndex >= 0 ? element.querySelector('text') : null;
    items.push({element, id, edgeIndex, isNode, isProvider, shapes, label,
      labelTransform: label?.getAttribute('transform')});
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
    nodeElement(id) { return items.find(item => item.isNode && item.id === id)?.element; },
    focusLabels() { return items.filter(item => item.element.hasAttribute('data-focused-label')).map(item => item.label); },
    draw(state, current, title, showAll = false, previewEdges = []) {
      svg.setAttribute('aria-label', title);
      svg.querySelectorAll('.choice-label-clearance').forEach(rect => rect.remove());
      for (const {element, id, edgeIndex, isNode, isProvider, shapes, label, labelTransform} of items) {
        const upcoming = edgeIndex >= 0 && previewEdges.some(choice => choice.edge === edgeIndex);
        const visible = showAll || upcoming || (isProvider ? state.nodes.some(node => node.startsWith(id + '.')) : isNode ? state.nodes.includes(id) : state.edges.includes(edgeIndex));
        const active = isProvider ? current.startsWith(id + '.') : isNode ? current === id : edgeIndex === state.activeEdge;
        element.style.opacity = visible ? (showAll || active || upcoming ? '1' : '0.3') : '0';
        element.style.pointerEvents = visible ? 'auto' : 'none';
        element.setAttribute('aria-hidden', String(!visible));
        if (edgeIndex >= 0) {
          element.querySelector('.choice-edge-preview')?.remove();
          element.removeAttribute('data-focused-label');
          if (label) {
            if (labelTransform === null) label.removeAttribute('transform');
            else label.setAttribute('transform', labelTransform);
          }
          const path = element.querySelector('path.connection');
          let box = label?.getBBox();
          const endpoints = connectionEndpoints(id);
          const nearCurrent = endpoints?.from === current || endpoints?.to === current;
          if (!showAll && visible && nearCurrent && box && path) {
            const length = path.getTotalLength();
            const outgoing = endpoints.from === current;
            const distance = Math.min(80, length / 3);
            const point = path.getPointAtLength(outgoing ? distance : length - distance);
            const toward = path.getPointAtLength(outgoing ? Math.min(length, distance + 1) : Math.max(0, length - distance - 1));
            const horizontal = Math.abs(toward.x - point.x) > Math.abs(toward.y - point.y);
            const x = horizontal ? (toward.x >= point.x ? point.x + 12 : point.x - box.width - 12) : point.x + 24;
            const y = horizontal ? point.y - box.height - 12 : point.y - box.height / 2;
            label.setAttribute('transform', `translate(${x - box.x} ${y - box.y}) ${labelTransform || ''}`);
            box = {x, y, width: box.width, height: box.height};
            element.setAttribute('data-focused-label', '');
          }
          if (box && (upcoming || element.hasAttribute('data-focused-label'))) {
            for (const mask of edgeMasks) mask.append(svgElement('rect', {
              class: 'choice-label-clearance', x: box.x - (upcoming ? 18 : 4), y: box.y - 4,
              width: box.width + (upcoming ? 22 : 8), height: box.height + 8, fill: 'black',
            }));
          }
          if (upcoming) {
            const point = box ? {x: box.x, y: box.y + box.height / 2} : path?.getPointAtLength(path.getTotalLength() / 2);
            if (point) {
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
