import {resolveConnections} from './connections.js';

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
export async function loadDiagram(url, container, content) {
  const response = await fetch(url, {cache: 'no-store'});
  if (!response.ok) throw new Error('Diagram loading failed');
  const text = await response.text();
  const ids = diagramIds(text);
  content = resolveConnections(content, ids);
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
    const isNode = nodes.has(id), isProvider = providers.has(id);
    if (edgeIndex < 0 && !isNode && !isProvider) continue;
    const shapes = [...element.querySelectorAll(':scope > .shape > *')].map(shape => ({shape, originalStyle: shape.getAttribute('style') || ''}));
    items.push({element, id, edgeIndex, isNode, isProvider, shapes});
    element.style.opacity = '0';
    element.style.pointerEvents = 'none';
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) element.style.transition = 'opacity 200ms';
  }
  container.replaceChildren(svg);
  return {
    ids,
    content,
    draw(state, current, title, showAll = false, previewEdges = []) {
      svg.setAttribute('aria-label', title);
      svg.querySelector('.choice-loops')?.remove();
      for (const {element, id, edgeIndex, isNode, isProvider, shapes} of items) {
        const upcoming = edgeIndex >= 0 && previewEdges.some(choice => choice.edge === edgeIndex);
        const visible = showAll || upcoming || (isProvider ? state.nodes.some(node => node.startsWith(id + '.')) : isNode ? state.nodes.includes(id) : state.edges.includes(edgeIndex));
        const active = isProvider ? current.startsWith(id + '.') : isNode ? current === id : edgeIndex === state.activeEdge;
        element.style.opacity = visible ? (showAll || active || upcoming ? '1' : '0.3') : '0';
        element.style.pointerEvents = visible ? 'auto' : 'none';
        element.setAttribute('aria-hidden', String(!visible));
        if (edgeIndex >= 0) {
          element.querySelector('.choice-edge-preview')?.remove();
          const labels = [...element.querySelectorAll('text')];
          for (const label of labels) label.style.visibility = '';
          if (upcoming) {
            const path = element.querySelector('path.connection');
            const box = labels[0]?.getBBox();
            const point = box ? {x: box.x, y: box.y + box.height / 2} : path?.getPointAtLength(path.getTotalLength() / 2);
            if (point) {
              const group = svgElement('g', {class: 'choice-edge-preview'});
              previewEdges.filter(choice => choice.edge === edgeIndex).forEach((choice, index) => {
                choiceLabel(group, choice, point.x, point.y + index * 24);
              });
              for (const label of labels) label.style.visibility = 'hidden';
              element.append(group);
            }
          }
        }
        for (const {shape, originalStyle} of shapes) {
          shape.setAttribute('style', originalStyle);
          if (isNode && active) { shape.style.fill = '#FFE29A'; shape.style.strokeWidth = '4'; }
        }
      }
      const localChoices = previewEdges.filter(choice => choice.edge === undefined);
      const node = items.find(item => item.isNode && item.id === current)?.element;
      if (node && localChoices.length) {
        const box = (node.querySelector(':scope > .shape') || node).getBBox();
        const group = svgElement('g', {class: 'choice-loops'});
        localChoices.forEach((choice, index) => {
          const x = box.x + box.width * 0.7;
          const bottom = box.y + box.height * 0.6;
          const top = box.y - 40 - index * 40;
          const right = box.x + box.width + 60 + index * 20;
          group.append(svgElement('path', {
            d: `M ${box.x + box.width} ${bottom} H ${right} V ${top} H ${x} V ${box.y}`,
            fill: 'none', stroke: choice.color, 'stroke-width': 2,
          }));
          group.append(svgElement('path', {
            d: `M ${x - 5} ${box.y - 8} L ${x} ${box.y} L ${x + 5} ${box.y - 8}`,
            fill: 'none', stroke: choice.color, 'stroke-width': 2,
          }));
          choiceLabel(group, choice, x + 16, top - 12);
        });
        // Use D2's inner coordinate system without changing the saved layout.
        (svg.querySelector('svg.d2-svg') || svg).append(group);
      }

    },
  };
}

function svgElement(tag, attributes) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}
function choiceLabel(group, choice, x, y) {
  const label = svgElement('text', {x, y, 'dominant-baseline': 'middle',
    'font-family': 'sans-serif', 'font-size': 14, fill: '#333',
    'paint-order': 'stroke', stroke: 'white', 'stroke-width': 4, 'stroke-linejoin': 'round'});
  label.textContent = choice.label;
  group.append(svgElement('circle', {class: 'choice-edge-marker', cx: x - 10, cy: y, r: 4, fill: choice.color, 'aria-hidden': true}), label);
}
