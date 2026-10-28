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
    activeEdge: transition.edge ?? previous.activeEdge};
}
export function validate(content, diagramIds) {
  const errors = [];
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
      if (!choice.id || !choice.label) errors.push(`${step.id}: choices need IDs and labels`);
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
