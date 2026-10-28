import test from 'node:test';
import assert from 'node:assert/strict';
import {attachViewport} from './viewport.js';

function fixture(initialZoom = 1) {
  const listeners = {};
  const classes = new Set();
  const attributes = {width: '800', height: '2000'};
  const panel = {
    clientWidth: 400, clientHeight: 600, scrollLeft: 200, scrollTop: 300,
    classList: {add: value => classes.add(value), remove: value => classes.delete(value)},
    addEventListener: (type, listener) => { listeners[type] = listener; },
    setPointerCapture(id) { this.capture = id; },
    hasPointerCapture(id) { return this.capture === id; },
    releasePointerCapture() { this.capture = null; },
  };
  const svg = {getAttribute: key => attributes[key], setAttribute: (key, value) => { attributes[key] = value; }};
  const controls = {out: {}, reset: {}, into: {}};
  const viewport = attachViewport(panel, svg, controls, initialZoom);
  const event = overrides => ({pointerId: 1, button: 0, clientX: 100, clientY: 100, target: {closest: () => null}, preventDefault() {}, ...overrides});
  return {panel, controls, viewport, attributes, listeners, event, classes};
}

test('zoom preserves the viewport center, scales uniformly, resets, and clamps', () => {
  const {panel, controls, viewport, attributes} = fixture();
  controls.into.onclick();
  assert.equal(viewport.zoom, 1.25);
  assert.equal(panel.scrollLeft, 300);
  assert.equal(panel.scrollTop, 450);
  assert.equal(attributes.width / attributes.height, 0.4);
  controls.reset.onclick();
  assert.equal(viewport.zoom, 1);
  assert.equal(panel.scrollLeft, 200);
  for (let i = 0; i < 30; i++) controls.into.onclick();
  assert.equal(viewport.zoom, 4);
  assert.equal(controls.into.disabled, true);
  for (let i = 0; i < 40; i++) controls.out.onclick();
  assert.equal(viewport.zoom, 0.25);
  assert.equal(controls.out.disabled, true);
});

test('drag pans both axes, captures pointer, and stops on cancellation', () => {
  const {panel, listeners, event, classes} = fixture();
  listeners.pointerdown(event());
  assert.equal(panel.capture, 1);
  listeners.pointermove(event({clientX: 80, clientY: 60}));
  assert.equal(panel.scrollLeft, 220);
  assert.equal(panel.scrollTop, 340);
  listeners.pointercancel(event());
  assert.equal(classes.has('dragging'), false);
  listeners.pointermove(event({clientX: 10}));
  assert.equal(panel.scrollLeft, 220);
});

test('saved zoom restores without moving scroll; links and other mouse buttons stay usable', () => {
  const {viewport, panel, listeners, event} = fixture(2);
  assert.equal(viewport.zoom, 2);
  assert.equal(panel.scrollLeft, 200);
  listeners.pointerdown(event({button: 2}));
  assert.equal(panel.capture, undefined);
  listeners.pointerdown(event({target: {closest: () => ({})}}));
  assert.equal(panel.capture, undefined);
});
