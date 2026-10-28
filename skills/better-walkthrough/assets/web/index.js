import {resolve, nextTransition, initialState, advance, validate} from './model.js';
import {loadDiagram} from '../d2/diagram.js';

const $ = id => document.getElementById(id);
const config = await (await fetch('/__config')).json();
const contentUrl = new URL(config.content, location.href);
const {default: content} = await import(contentUrl.href);
document.title = content.title;
const node = Object.fromEntries(content.steps.map(step => [step.id, step.highlight]));
const decisionOptions = Object.fromEntries(content.steps.filter(step => step.choices?.length).map(step => [step.id, step.choices.map(choice => choice.id)]));
const decisions = new Map();
const triedChoices = new Map();
const storageKey = content.storageKey || `${content.id}:walkthrough:v1`;
let history = [initialState(content)];
let restoredScroll;
let diagram;
const state = () => history.at(-1);
const definition = () => content.steps.find(step => step.id === state().stage);
function go(transition) {
  history.push(advance(content, state(), transition));
  render();
}
function paragraph(parent, text) {
  const p = document.createElement('p'); p.textContent = text; parent.append(p);
}
function renderExamples(parent, examples = []) {
  for (const example of examples) {
    let target = parent;
    if (example.disclosure) {
      target = document.createElement('details');
      const summary = document.createElement('summary'); summary.textContent = example.disclosure;
      target.append(summary); parent.append(target);
    }
    if (example.text) paragraph(target, example.text);
    for (const text of example.paragraphs || []) paragraph(target, text);
    if (example.facts) {
      const list = document.createElement('dl');
      for (const [label, value] of Object.entries(example.facts)) {
        const term = document.createElement('dt'); term.textContent = label;
        const detail = document.createElement('dd'); detail.textContent = String(value);
        list.append(term, detail);
      }
      target.append(list);
    }
    if (Object.hasOwn(example, 'data')) {
      const pre = document.createElement('pre'); pre.textContent = JSON.stringify(example.data, null, 2); target.append(pre);
    }
  }
}
function renderChoices(step, snapshot) {
  if (!step.choices?.length) return;
  const tried = triedChoices.get(step.id) || new Set();
  decisions.set(step.id, {history: history.slice(), options: step.choices.map(choice => choice.id)});
  const fieldset = document.createElement('fieldset');
  const legend = document.createElement('legend'); legend.textContent = step.legend || 'Choices'; fieldset.append(legend);
  for (const choice of step.choices) {
    const section = document.createElement('div');
    const data = document.createElement('div'); data.className = 'example-data';
    if (choice.summary) paragraph(data, resolve(choice.summary, snapshot));
    renderExamples(data, resolve(choice.examples, snapshot));
    if (data.childNodes.length) section.append(data);
    const button = document.createElement('button'); button.textContent = choice.label;
    button.style.opacity = tried.has(choice.id) ? '0.5' : '1';
    button.dataset.choice = choice.id;
    button.onclick = () => { tried.add(choice.id); triedChoices.set(step.id, tried); go(choice); };
    section.append(button); fieldset.append(section);
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
    link.textContent = options.find(option => option.id === label)?.alternative || label;
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
  $('title').textContent = resolve(step.title, snapshot);
  $('explanation').textContent = resolve(step.explanation, snapshot) || '';
  $('data').replaceChildren(); $('choices').replaceChildren(); $('reasons').replaceChildren();
  $('back').disabled = history.length === 1;
  const next = nextTransition(step, snapshot);
  $('next').disabled = !next;
  $('next').onclick = next ? () => go(next) : null;
  renderExamples($('data'), resolve(step.examples, snapshot));
  for (const reason of resolve(step.reasons, snapshot) || []) {
    const li = document.createElement('li'); li.textContent = reason; $('reasons').append(li);
  }
  $('reasons').hidden = !$('reasons').childNodes.length;
  renderChoices(step, snapshot);
  renderAlternatives();
  renderExploration();
  saveProgress();
  diagram?.draw(snapshot, step.highlight, $('title').textContent);
}
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
restoreProgress();
try {
  $('diagram-status').textContent = 'Loading diagram…';
  diagram = await loadDiagram(new URL(content.diagram, contentUrl), $('diagram'), content);
  const errors = validate(content, diagram.ids);
  if (errors.length) throw new Error(errors.join('\n'));
  $('diagram-status').textContent = '';
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
