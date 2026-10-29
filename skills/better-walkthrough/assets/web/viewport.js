export function attachViewport(panel, svg, controls, initialZoom = 1, onChange = () => {}, initialCamera = null) {
  const layer = svg.parentElement;
  const width = Number(svg.getAttribute('width'));
  const height = Number(svg.getAttribute('height'));
  const {out, reset, into, occlusion, horizontal, vertical} = controls;
  const clampZoom = value => Math.min(5, Math.max(0.25, Number.isFinite(value) ? value : 1));
  let camera = initialCamera ? {...initialCamera, zoom: clampZoom(initialCamera.zoom)}
    : {x: 0, y: 0, zoom: clampZoom(initialZoom)};
  let viewWidth = panel.clientWidth, viewHeight = panel.clientHeight;
  let drawFrame, animationFrame, saveTimer, drag;
  let targetZoom = camera.zoom;
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function updateScrollbars() {
    // Include the viewport in the bounds so panning can continue past diagram edges.
    for (const [track, translation, viewport, extent, size, offset] of [
      [horizontal, camera.x, viewWidth, width, 'width', 'left'],
      [vertical, camera.y, viewHeight, height, 'height', 'top'],
    ]) {
      if (!track) continue;
      const start = -translation / camera.zoom;
      const visible = viewport / camera.zoom;
      const min = Math.min(0, start), max = Math.max(extent, start + visible);
      const total = max - min;
      track.hidden = total <= visible + 0.01;
      track.firstElementChild.style[size] = `${visible / total * 100}%`;
      track.firstElementChild.style[offset] = `${(start - min) / total * 100}%`;
    }
  }
  function draw() {
    drawFrame = null;
    layer.style.transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`;
    const percent = `${Math.round(camera.zoom * 100)}%`;
    if (reset.textContent !== percent) reset.textContent = percent;
    out.disabled = targetZoom <= 0.25;
    into.disabled = targetZoom >= 5;
    updateScrollbars();
  }
  function scheduleDraw() {
    if (drawFrame == null) drawFrame = requestAnimationFrame(draw);
  }
  function flushDraw() {
    cancelAnimationFrame(drawFrame);
    draw();
  }
  function saveWhenSettled() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(onChange, 200);
  }
  function stopAnimation() {
    cancelAnimationFrame(animationFrame);
    clearTimeout(saveTimer);
    targetZoom = camera.zoom;
  }
  function visibleArea() {
    const inset = occlusion && occlusion.dataset.minimized !== 'true'
      ? Math.max(0, occlusion.getBoundingClientRect().right - panel.getBoundingClientRect().left + 16) : 0;
    return {inset, width: Math.max(1, viewWidth - inset)};
  }
  function animateTo(next) {
    stopAnimation();
    targetZoom = next.zoom;
    if (reducedMotion()) {
      camera = next;
      flushDraw();
      onChange();
      return;
    }
    const start = {...camera};
    const started = performance.now();
    const tick = time => {
      const progress = Math.min(1, (time - started) / 600);
      const eased = 1 - (1 - progress) ** 3;
      camera = {
        x: start.x + (next.x - start.x) * eased,
        y: start.y + (next.y - start.y) * eased,
        zoom: start.zoom + (next.zoom - start.zoom) * eased,
      };
      flushDraw();
      if (progress < 1) animationFrame = requestAnimationFrame(tick);
      else onChange();
    };
    animationFrame = requestAnimationFrame(tick);
  }
  function zoomAt(value, point) {
    const zoom = clampZoom(value), ratio = zoom / camera.zoom;
    return {x: point.x - (point.x - camera.x) * ratio,
      y: point.y - (point.y - camera.y) * ratio, zoom};
  }
  function buttonZoom(value) {
    const area = visibleArea();
    animateTo(zoomAt(value, {x: area.inset + area.width / 2, y: viewHeight / 2}));
  }
  out.onclick = () => buttonZoom(targetZoom / 1.25);
  into.onclick = () => buttonZoom(targetZoom * 1.25);
  reset.onclick = () => buttonZoom(1);
  panel.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.isPrimary === false || event.target.closest('a, button, input, select, textarea')) return;
    stopAnimation();
    drag = {id: event.pointerId, x: event.clientX, y: event.clientY, camera: {...camera}};
    panel.setPointerCapture(event.pointerId);
    panel.classList.add('dragging');
    panel.classList.toggle('mouse-dragging', event.pointerType === 'mouse');
    scheduleDraw();
    event.preventDefault();
  });
  panel.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    camera.x = drag.camera.x + event.clientX - drag.x;
    camera.y = drag.camera.y + event.clientY - drag.y;
    scheduleDraw();
  });
  const finish = event => {
    if (!drag || drag.id !== event.pointerId) return;
    drag = null;
    panel.classList.remove('dragging', 'mouse-dragging');
    if (panel.hasPointerCapture(event.pointerId)) panel.releasePointerCapture(event.pointerId);
    onChange();
  };
  panel.addEventListener('pointerup', finish);
  panel.addEventListener('pointercancel', finish);
  panel.addEventListener('lostpointercapture', finish);
  panel.addEventListener('wheel', event => {
    if (!event.deltaY) return;
    event.preventDefault();
    if (drag) return;
    stopAnimation();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewHeight : 1;
    const delta = Math.max(-120, Math.min(120, event.deltaY * unit));
    const rect = panel.getBoundingClientRect();
    camera = zoomAt(camera.zoom * Math.exp(-delta * 0.001), {
      x: event.clientX - rect.left - panel.clientLeft,
      y: event.clientY - rect.top - panel.clientTop,
    });
    targetZoom = camera.zoom;
    scheduleDraw();
    saveWhenSettled();
  }, {passive: false});
  new ResizeObserver(() => {
    viewWidth = panel.clientWidth;
    viewHeight = panel.clientHeight;
    scheduleDraw();
  }).observe(panel);
  draw();
  return {
    get zoom() { return camera.zoom; },
    get camera() { return {...camera}; },
    focus(element, labels = []) {
      if (!element) return;
      stopAnimation();
      flushDraw();
      const box = element.getBoundingClientRect();
      const origin = svg.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const context = labels.map(label => label.getBoundingClientRect());
      const bounds = {
        left: Math.min(box.left, ...context.map(rect => rect.left - 18)),
        right: Math.max(box.right, ...context.map(rect => rect.right)),
        top: Math.min(box.top, ...context.map(rect => rect.top)),
        bottom: Math.max(box.bottom, ...context.map(rect => rect.bottom)),
      };
      const center = {
        x: ((bounds.left + bounds.right) / 2 - origin.left) / camera.zoom,
        y: ((bounds.top + bounds.bottom) / 2 - origin.top) / camera.zoom,
      };
      const area = visibleArea();
      const zoom = clampZoom(Math.min(area.width * 0.65 / (box.width / camera.zoom),
        viewHeight * 0.5 / (box.height / camera.zoom),
        area.width * 0.9 / ((bounds.right - bounds.left) / camera.zoom),
        viewHeight * 0.85 / ((bounds.bottom - bounds.top) / camera.zoom)));
      animateTo({x: area.inset + area.width / 2 - center.x * zoom,
        y: viewHeight / 2 - center.y * zoom, zoom});
    },
  };
}
