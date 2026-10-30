import {startViewer} from './index.js';

const options = {cache: 'no-store', mode: 'same-origin', redirect: 'error'};
try {
  const config = await (await fetch('/__config', options)).json();
  const contentUrl = new URL(config.content, location.href);
  if (contentUrl.origin !== location.origin) throw new Error('Content must use the viewer origin');
  const {default: content} = await import(contentUrl.href);
  const diagramUrl = new URL(content.diagram, contentUrl);
  if (diagramUrl.origin !== location.origin) throw new Error('Diagram must use the viewer origin');
  const response = await fetch(diagramUrl, options);
  if (!response.ok) throw new Error('Diagram loading failed');
  startViewer(content, await response.text());
} catch (error) {
  document.getElementById('diagram-status').textContent = error.message;
  document.getElementById('next').disabled = true;
}

async function watchChanges() {
  let revision;
  const poll = async () => {
    try {
      const response = await fetch('/__version', {cache: 'no-store', mode: 'same-origin', redirect: 'error'});
      if (response.ok) {
        const nextRevision = (await response.json()).revision;
        if (revision && nextRevision !== revision) {
          location.reload();
          return;
        }
        revision = nextRevision;
      }
    } catch { /* Retry after a server restart. */ }
    setTimeout(poll, 1000);
  };
  await poll();
}
watchChanges();
