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
    draw(state, current, title, showAll = false, previewEdges = new Map()) {
      svg.setAttribute('aria-label', title);
      for (const {element, id, edgeIndex, isNode, isProvider, shapes} of items) {
        const upcoming = edgeIndex >= 0 && previewEdges.has(edgeIndex);
        const visible = showAll || upcoming || (isProvider ? state.nodes.some(node => node.startsWith(id + '.')) : isNode ? state.nodes.includes(id) : state.edges.includes(edgeIndex));
        const active = isProvider ? current.startsWith(id + '.') : isNode ? current === id : edgeIndex === state.activeEdge;
        element.style.opacity = visible ? (showAll || active || upcoming ? '1' : '0.3') : '0';
        element.style.pointerEvents = visible ? 'auto' : 'none';
        element.setAttribute('aria-hidden', String(!visible));
        if (edgeIndex >= 0) {
          let marker = element.querySelector('.choice-edge-marker');
          if (upcoming) {
            if (!marker) {
              marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              marker.setAttribute('class', 'choice-edge-marker');
              marker.setAttribute('r', '4'); marker.setAttribute('aria-hidden', 'true');
              element.append(marker);
            }
            const label = element.querySelector('text');
            const path = element.querySelector('path.connection');
            const box = label?.getBBox();
            const point = !box && path?.getPointAtLength(path.getTotalLength() / 2);
            marker.setAttribute('cx', box ? box.x - 10 : point.x);
            marker.setAttribute('cy', box ? box.y + box.height / 2 : point.y - 10);
            marker.setAttribute('fill', previewEdges.get(edgeIndex));
          } else marker?.remove();
        }
        for (const {shape, originalStyle} of shapes) {
          shape.setAttribute('style', originalStyle);
          if (isNode && active) { shape.style.fill = '#FFE29A'; shape.style.strokeWidth = '4'; }
        }
      }
    },
  };
}
