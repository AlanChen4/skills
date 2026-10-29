import {resolve, nextTransition, initialState, advance, validate} from './model.js';
import {loadDiagram} from '../d2/diagram.js';
import {attachViewport} from './viewport.js';

const $ = id => document.getElementById(id);
const config = await (await fetch('/__config')).json();
const contentUrl = new URL(config.content, location.href);
let {default: content} = await import(contentUrl.href);
document.title = content.title;
const node = Object.fromEntries(content.steps.map(step => [step.id, step.highlight]));
const decisionOptions = Object.fromEntries(content.steps.filter(step => step.choices?.length).map(step => [step.id, step.choices.map(choice => choice.id)]));
const decisions = new Map();
const triedChoices = new Map();
const storageKey = content.storageKey || `${content.id}:walkthrough:v1`;
let history = [initialState(content)];
let restoredScroll;
let diagram;
let viewport;
let restoredZoom = 1;
let showAll = false;
const state = () => history.at(-1);
const definition = () => content.steps.find(step => step.id === state().stage);
function go(transition) {
  history.push(advance(content, state(), transition));
  render();
}
function inline(parent, text) {
  parent.replaceChildren();
  String(text ?? '').split(/`([^`\n]+)`/g).forEach((part, index) => {
    if (index % 2) {
      const code = document.createElement('code'); code.textContent = part; parent.append(code);
    } else parent.append(document.createTextNode(part));
  });
}
function labelExample(parent) {
  const label = document.createElement('small');
  label.className = 'example-label'; label.textContent = 'Example'; parent.prepend(label);
}
function paragraph(parent, text) {
  const p = document.createElement('p'); inline(p, text); parent.append(p);
}
function renderExamples(parent, examples = []) {
  for (const example of examples) {
    let target = parent;
    if (example.disclosure) {
      target = document.createElement('details');
      const summary = document.createElement('summary'); inline(summary, example.disclosure);
      target.append(summary); parent.append(target);
    }
    if (example.text) paragraph(target, example.text);
    for (const text of example.paragraphs || []) paragraph(target, text);
    if (example.facts) {
      const table = document.createElement('table'); table.className = 'example-facts';
      const body = document.createElement('tbody');
      for (const [label, value] of Object.entries(example.facts)) {
        const row = document.createElement('tr');
        const term = document.createElement('th'); term.scope = 'row'; inline(term, label);
        const detail = document.createElement('td'); inline(detail, String(value));
        row.append(term, detail); body.append(row);
      }
      table.append(body); target.append(table);
    }
    if (Object.hasOwn(example, 'data')) {
      const pre = document.createElement('pre'); pre.textContent = JSON.stringify(example.data, null, 2); target.append(pre);
    }
  }
}
function renderChoices(step, snapshot) {
  if (!step.choices?.length) return;
  const tried = triedChoices.get(step.id) || new Set();
  const colors = choiceColors(step.choices);
  decisions.set(step.id, {history: history.slice(), options: step.choices.map(choice => choice.id)});
  const fieldset = document.createElement('fieldset'); fieldset.className = 'panel';
  const heading = document.createElement('p'); heading.id = 'choices-title'; heading.className = 'panel-label';
  heading.textContent = step.legend || 'What to explore next?'; fieldset.append(heading);
  fieldset.setAttribute('aria-labelledby', heading.id);
  const list = document.createElement('div'); list.className = 'choice-list';
  fieldset.append(list);
  for (const choice of orderedChoices(step.choices)) {
    const section = document.createElement('div');
    const data = document.createElement('div'); data.className = 'example-data';
    if (choice.summary) paragraph(data, resolve(choice.summary, snapshot));
    renderExamples(data, resolve(choice.examples, snapshot));
    if (data.childNodes.length) { labelExample(data); section.append(data); }
    const button = document.createElement('button'); inline(button, choice.label);
    if (colors.has(choice.id)) {
      const dot = document.createElement('span'); dot.className = 'choice-dot';
      dot.style.backgroundColor = colors.get(choice.id); dot.setAttribute('aria-hidden', 'true');
      button.prepend(dot);
    }
    button.style.opacity = tried.has(choice.id) ? '0.5' : '1';
    button.dataset.choice = choice.id;
    button.onclick = () => { tried.add(choice.id); triedChoices.set(step.id, tried); go(choice); };
    section.append(button); list.append(section);
  }
  $('choices').append(fieldset);
}
function unexploredDecision() {
  const hasUntried = stage => decisions.get(stage)?.options.some(label => !triedChoices.get(stage)?.has(label));
  // Prefer an ancestor of this path, preserving all choices before that decision.
  for (let index = history.length - 2; index >= 0; index--) {
    const stage = history[index].stage;
    if (hasUntried(stage)) return history.slice(0, index + 1);
  }
  // A previously visited branch may still contain untried decisions.
  for (const [stage, checkpoint] of [...decisions].reverse()) {
    if (stage !== state().stage && hasUntried(stage)) return checkpoint.history.slice();
  }
  return null;
}
function renderAlternatives() {
  $('alternatives').replaceChildren();
  if (!$('next').disabled || definition().choices?.length) return;
  const checkpoint = unexploredDecision();
  if (!checkpoint) return;
  const stage = checkpoint.at(-1).stage;
  const options = content.steps.find(step => step.id === stage).choices;
  paragraph($('alternatives'), "See what would've happened if…");
  const list = document.createElement('ul');
  $('alternatives').append(list);
  for (const label of decisions.get(stage).options) {
    if (triedChoices.get(stage)?.has(label)) continue;
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = '#';
    inline(link, options.find(option => option.id === label)?.alternative || label);
    link.onclick = event => {
      event.preventDefault();
      history = checkpoint.slice();
      render();
      [...$('choices').querySelectorAll('button')].find(button => button.dataset.choice === label)?.click();
      $('step').scrollTop = 0;
      saveProgress();
    };
    item.append(link);
    list.append(item);
  }
}
function saveProgress() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      history,
      zoom: viewport?.zoom ?? restoredZoom,
      showAll,
      decisions: [...decisions],
      triedChoices: [...triedChoices].map(([stage, choices]) => [stage, [...choices]]),
      scroll: {step: $('step').scrollTop, diagramTop: $('diagram-panel').scrollTop, diagramLeft: $('diagram-panel').scrollLeft},
    }));
  } catch { /* Continue normally if browser storage is unavailable. */ }
}
function restoreProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (!saved) return;
    const validSnapshot = snapshot => snapshot && Object.hasOwn(node, snapshot.stage)
      && Array.isArray(snapshot.nodes) && snapshot.nodes.every(id => Object.values(node).includes(id))
      && Array.isArray(snapshot.edges) && snapshot.edges.every(edge => Number.isInteger(edge) && edge >= 0 && edge < content.edges.length);
    if (!Array.isArray(saved.history) || !saved.history.length || saved.history[0].stage !== content.start
      || !saved.history.every(validSnapshot)) return;
    const checkpoints = new Map(saved.decisions);
    const tried = new Map(saved.triedChoices.map(([stage, labels]) => [stage, new Set(labels)]));
    for (const [stage, checkpoint] of checkpoints) {
      if (!decisionOptions[stage] || !checkpoint.options?.every(id => decisionOptions[stage].includes(id)) || !Array.isArray(checkpoint.history)
        || !checkpoint.history.length || !checkpoint.history.every(validSnapshot)
        || !Array.isArray(checkpoint.options) || !checkpoint.options.every(label => typeof label === 'string')) return;
    }
    history = saved.history;
    for (const entry of checkpoints) decisions.set(...entry);
    for (const entry of tried) triedChoices.set(...entry);
    restoredScroll = saved.scroll;
    if (Number.isFinite(saved.zoom)) restoredZoom = saved.zoom;
    showAll = saved.showAll === true;
  } catch { /* Ignore incomplete or outdated saved progress. */ }
}
async function watchChanges() {
  let revision;
  const poll = async () => {
    try {
      const response = await fetch('__version', {cache: 'no-store'});
      if (response.ok) {
        const nextRevision = (await response.json()).revision;
        if (revision && nextRevision !== revision) {
          saveProgress();
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
function renderExploration() {
  const total = Object.values(decisionOptions).reduce((sum, labels) => sum + labels.length, 0);
  const explored = Object.entries(decisionOptions).reduce((sum, [stage, labels]) =>
    sum + labels.filter(label => triedChoices.get(stage)?.has(label)).length, 0);
  $('explored').textContent = `Explored ${total ? Math.floor(explored / total * 100) : (definition().next ? 0 : 100)}%`;
  $('explored').dataset.complete = String(total ? explored === total : !definition().next);
  $('restart').hidden = total ? explored !== total : Boolean(definition().next);
  $('explored').title = `${explored} of ${total} decision options explored`;
}

function render() {
  const snapshot = state(), step = definition();
  inline($('title'), resolve(step.title, snapshot));
  inline($('explanation'), resolve(step.explanation, snapshot));
  $('data').replaceChildren(); $('choices').replaceChildren(); $('reasons').replaceChildren();
  $('back').disabled = history.length === 1;
  const next = nextTransition(step, snapshot);
  $('next').disabled = !next;
  $('next').onclick = next ? () => go(next) : null;
  renderExamples($('data'), resolve(step.examples, snapshot));
  if ($('data').childNodes.length) labelExample($('data'));
  for (const reason of resolve(step.reasons, snapshot) || []) {
    const li = document.createElement('li'); inline(li, reason); $('reasons').append(li);
  }
  $('reasons').hidden = !$('reasons').childNodes.length;
  renderChoices(step, snapshot);
  renderAlternatives();
  renderExploration();
  saveProgress();
  drawDiagram();
}
function drawDiagram() {
  const step = definition();
  const colors = choiceColors(step.choices || []);
  const previewEdges = orderedChoices(step.choices || []).map(choice => ({edge: choice.edge, label: choice.label.replaceAll('`', ''), color: colors.get(choice.id)}));
  diagram?.draw(state(), step.highlight, $('title').textContent, showAll, previewEdges);
  $('toggle-all').setAttribute('aria-pressed', String(showAll));
  $('toggle-all').title = showAll ? 'Show only the explored path' : 'Show the complete diagram';
}
function orderedChoices(choices) {
  const counts = new Map();
  for (const choice of choices) if (choice.edge !== undefined) counts.set(choice.edge, (counts.get(choice.edge) || 0) + 1);
  const rank = choice => choice.edge === undefined ? 2 : counts.get(choice.edge) > 1 ? 1 : 0;
  return [...choices].sort((a, b) => rank(a) - rank(b));
}
function choiceColors(choices) {
  const palette = ['#0072B2', '#D55E00', '#009E73', '#CC79A7', '#E69F00', '#56B4E9', '#332288', '#882255'];
  const routes = [...new Set(choices.map(choice => choice.edge ?? choice.id))];
  return new Map(choices.map(choice => [choice.id, palette[routes.indexOf(choice.edge ?? choice.id) % palette.length]]));
}
$('toggle-all').onclick = () => { showAll = !showAll; drawDiagram(); saveProgress(); };
$('back').onclick = () => { if (history.length > 1) { history.pop(); render(); } };
$('restart').onclick = () => {
  if ($('restart').hidden) return;
  history = history.slice(0, 1);
  decisions.clear();
  triedChoices.clear();
  restoredScroll = null;
  $('step').scrollTop = 0;
  $('diagram-panel').scrollTop = 0;
  $('diagram-panel').scrollLeft = 0;
  render();
};
let scrollSave;
for (const id of ['step', 'diagram-panel']) {
  $(id).addEventListener('scroll', () => {
    clearTimeout(scrollSave);
    scrollSave = setTimeout(saveProgress, 100);
  });
}
addEventListener('pagehide', saveProgress);
try {
  $('diagram-status').textContent = 'Loading diagram…';
  diagram = await loadDiagram(new URL(content.diagram, contentUrl), $('diagram'), content);
  content = diagram.content;
  const errors = validate(content, diagram.ids);
  if (errors.length) throw new Error(errors.join('\n'));
  restoreProgress();
  $('diagram-status').textContent = '';
  viewport = attachViewport($('diagram-panel'), $('diagram').firstElementChild, {
    out: $('zoom-out'), reset: $('zoom-reset'), into: $('zoom-in'),
  }, restoredZoom, saveProgress);
  $('zoom-reset').disabled = false;
  $('toggle-all').disabled = false;
  render();
  if (restoredScroll) {
    $('step').scrollTop = restoredScroll.step || 0;
    $('diagram-panel').scrollTop = restoredScroll.diagramTop || 0;
    $('diagram-panel').scrollLeft = restoredScroll.diagramLeft || 0;
    restoredScroll = null;
  }
} catch (error) {
  $('diagram-status').textContent = error.message;
  $('next').disabled = true;
}
watchChanges();
