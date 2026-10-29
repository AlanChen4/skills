// Pure helpers shared by the browser and command-line validation.
export const resolve = (value, state) => typeof value === 'function' ? value(state) : value;
export const nextTransition = (step, state) => {
  const options = Array.isArray(step.next) ? step.next : [step.next];
  return options.find(option => option && (option.when === undefined || resolve(option.when, state)));
};
export function initialState(content) {
  const step = content.steps.find(step => step.id === content.start);
  return {...content.initial, stage: step.id, nodes: [step.highlight], edges: []};
}
export function advance(content, previous, transition) {
  const step = content.steps.find(step => step.id === transition.to);
  if (!step) throw new Error(`Unknown step: ${transition.to}`);
  const edges = [...previous.edges];
  if (transition.edge !== undefined && !edges.includes(transition.edge)) edges.push(transition.edge);
  return {...previous, ...resolve(transition.updates || {}, previous), stage: step.id,
    nodes: [...new Set([...previous.nodes, step.highlight])], edges,
    activeEdge: transition.edge ?? previous.activeEdge, selectedChoice: transition.id ?? null};
}
export function validate(content, diagramIds) {
  const errors = validatePresentation(content);
  const steps = content.steps || [];
  const ids = new Set();
  for (const step of steps) {
    if (!step.id || ids.has(step.id)) errors.push(`Missing or duplicate step ID: ${step.id}`);
    ids.add(step.id);
  }
  if (!ids.has(content.start)) errors.push(`Unknown start step: ${content.start}`);
  const edges = content.edges || [];
  if (new Set(edges).size !== edges.length) errors.push('Duplicate diagram connection references');
  for (const edge of edges) {
    if (!diagramIds.has(edge)) errors.push(`Missing diagram connection: ${edge}`);
  }
  for (const step of steps) {
    if (!diagramIds.has(step.highlight)) errors.push(`${step.id}: missing diagram node ${step.highlight}`);
    if (step.next && step.choices?.length) errors.push(`${step.id}: use Next or choices, not both`);
    const choices = step.choices || [];
    if (new Set(choices.map(choice => choice.id)).size !== choices.length) errors.push(`${step.id}: duplicate choice IDs`);
    const transitions = [...(Array.isArray(step.next) ? step.next : step.next ? [step.next] : []), ...choices];
    for (const choice of choices) {
      if (!choice.id || typeof choice.label !== 'string' || !choice.label.trim()) errors.push(`${step.id}: choices need IDs and labels`);
    }
    for (const choice of choices) {
      const target = steps.find(target => target.id === choice.to);
      if (choice.edge === undefined && target && target.highlight !== step.highlight) errors.push(`${step.id}: choice ${choice.id} moves to ${target.highlight}; provide a diagram edge. Only choices that stay on the same node can use a temporary self-loop.`);
    }
    for (const transition of transitions) {
      if (!ids.has(transition.to)) errors.push(`${step.id}: unknown target ${transition.to}`);
      if (transition.edge !== undefined && (!Number.isInteger(transition.edge) || !edges[transition.edge])) errors.push(`${step.id}: unknown connection ${transition.edge}`);
    }
  }
  const visited = new Set();
  const visit = id => {
    if (visited.has(id)) return;
    visited.add(id);
    const step = steps.find(step => step.id === id);
    if (!step) return;
    for (const transition of [...(Array.isArray(step.next) ? step.next : step.next ? [step.next] : []), ...(step.choices || [])]) visit(transition.to);
  };
  visit(content.start);
  for (const id of ids) if (!visited.has(id)) errors.push(`Unreachable step: ${id}`);
  return errors;
}

// Check literal presentation values without executing state-dependent functions.
export function validatePresentation(content) {
  const errors = [];
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
  const fail = (path, expected) => errors.push(`${path}: expected ${expected}`);
  function json(value, path, ancestors = new Set()) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean'
      || typeof value === 'number' && Number.isFinite(value)) return;
    if (!Array.isArray(value) && !record(value)) { fail(path, 'plain JSON data; move state functions to the outer examples field'); return; }
    if (ancestors.has(value)) { fail(path, 'JSON data without circular references'); return; }
    const next = new Set(ancestors).add(value);
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index++) json(value[index], `${path}[${index}]`, next);
    } else {
      for (const [key, child] of Object.entries(value)) json(child, `${path}.${key}`, next);
    }
  }
  function text(value, path) {
    if (typeof value !== 'string') fail(path, 'text');
  }
  function texts(value, path) {
    if (!Array.isArray(value)) { fail(path, 'an array of text'); return; }
    value.forEach((entry, index) => text(entry, `${path}[${index}]`));
  }
  function examples(value, path) {
    if (!Array.isArray(value)) { fail(path, 'an array of example objects, or a function returning that array'); return; }
    value.forEach((example, index) => {
      const at = `${path}[${index}]`;
      if (!record(example)) { fail(at, 'an example object'); return; }
      for (const key of ['text', 'disclosure']) if (Object.hasOwn(example, key)) text(example[key], `${at}.${key}`);
      if (Object.hasOwn(example, 'paragraphs')) texts(example.paragraphs, `${at}.paragraphs`);
      if (Object.hasOwn(example, 'data')) json(example.data, `${at}.data`);
      if (Object.hasOwn(example, 'facts')) {
        if (!record(example.facts)) fail(`${at}.facts`, 'a flat object of values; move state functions to the outer examples field');
        else for (const [key, value] of Object.entries(example.facts)) {
          if (value !== null && !['string','number','boolean'].includes(typeof value)
            || typeof value === 'number' && !Number.isFinite(value)) fail(`${at}.facts.${key}`, 'text, a finite number, a boolean, or null');
        }
      }
    });
  }
  function field(object, key, path, check) {
    if (Object.hasOwn(object, key) && typeof object[key] !== 'function') check(object[key], `${path}.${key}`);
  }
  for (const step of content.steps || []) {
    const path = `steps.${step.id}`;
    for (const key of ['title','explanation']) field(step, key, path, text);
    field(step, 'reasons', path, texts);
    field(step, 'examples', path, examples);
    for (const choice of step.choices || []) {
      field(choice, 'summary', `${path}.choices.${choice.id}`, text);
      field(choice, 'examples', `${path}.choices.${choice.id}`, examples);
    }
  }
  return errors;
}
