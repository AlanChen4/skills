export function attachViewport(panel, svg, controls, initialZoom = 1, onChange = () => {}) {
  const width = Number(svg.getAttribute('width'));
  const height = Number(svg.getAttribute('height'));
  let zoom = 1;
  let targetZoom = 1;
  let frame;
  let drag;
  const {out, reset, into} = controls;
  function stopZoom() {
    cancelAnimationFrame(frame);
    targetZoom = zoom;
    out.disabled = zoom <= 0.25;
    into.disabled = zoom >= 4;
  }
  function setZoom(value, anchor = true) {
    cancelAnimationFrame(frame);
    const next = Math.min(4, Math.max(0.25, Number.isFinite(value) ? value : 1));
    targetZoom = next;
    const x = panel.clientWidth / 2, y = panel.clientHeight / 2;
    const left = (panel.scrollLeft + x) / zoom;
    const top = (panel.scrollTop + y) / zoom;
    function draw(value) {
      zoom = value;
      svg.setAttribute('width', width * zoom);
      svg.setAttribute('height', height * zoom);
      if (anchor) {
        panel.scrollLeft = left * zoom - x;
        panel.scrollTop = top * zoom - y;
      }
      reset.textContent = `${Math.round(zoom * 100)}%`;
    }
    out.disabled = next <= 0.25;
    into.disabled = next >= 4;
    if (!anchor || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      draw(next);
      onChange();
      return;
    }
    const startZoom = zoom;
    let started;
    const tick = time => {
      started ??= time;
      const progress = Math.min(1, (time - started) / 220);
      draw(startZoom + (next - startZoom) * (1 - (1 - progress) ** 3));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else onChange();
    };
    frame = requestAnimationFrame(tick);
  }
  out.onclick = () => setZoom(targetZoom / 1.25);
  into.onclick = () => setZoom(targetZoom * 1.25);
  reset.onclick = () => setZoom(1);
  panel.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.isPrimary === false || event.target.closest('a, button, input, select, textarea')) return;
    stopZoom();
    drag = {id: event.pointerId, x: event.clientX, y: event.clientY, left: panel.scrollLeft, top: panel.scrollTop};
    panel.setPointerCapture(event.pointerId);
    panel.classList.add('dragging');
    event.preventDefault();
  });
  panel.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    panel.scrollLeft = drag.left - (event.clientX - drag.x);
    panel.scrollTop = drag.top - (event.clientY - drag.y);
  });
  const finish = event => {
    if (!drag || drag.id !== event.pointerId) return;
    drag = null;
    panel.classList.remove('dragging');
    if (panel.hasPointerCapture(event.pointerId)) panel.releasePointerCapture(event.pointerId);
    onChange();
  };
  panel.addEventListener('pointerup', finish);
  panel.addEventListener('pointercancel', finish);
  panel.addEventListener('lostpointercapture', finish);
  panel.addEventListener('wheel', stopZoom, {passive: true});
  setZoom(initialZoom, false);
  return {get zoom() { return targetZoom; }};
}
