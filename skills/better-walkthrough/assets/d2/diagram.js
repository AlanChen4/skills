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
      for (const {element, id, edgeIndex, isNode, isProvider, shapes} of items) {
        const upcoming = edgeIndex >= 0 && previewEdges.includes(edgeIndex);
        const visible = showAll || upcoming || (isProvider ? state.nodes.some(node => node.startsWith(id + '.')) : isNode ? state.nodes.includes(id) : state.edges.includes(edgeIndex));
        const active = isProvider ? current.startsWith(id + '.') : isNode ? current === id : edgeIndex === state.activeEdge;
        element.style.opacity = visible ? (showAll || active ? '1' : upcoming ? '0.65' : '0.3') : '0';
        element.style.pointerEvents = visible ? 'auto' : 'none';
        element.setAttribute('aria-hidden', String(!visible));
        for (const {shape, originalStyle} of shapes) {
          shape.setAttribute('style', originalStyle);
          if (isNode && active) { shape.style.fill = '#FFE29A'; shape.style.strokeWidth = '4'; }
        }
      }
    },
  };
}
