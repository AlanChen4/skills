// Resolve author-facing endpoints against actual compiled SVG connection IDs.
export function resolveConnections(content, ids) {
  if (Array.isArray(content.edges)) return content;
  const definitions = content.edges || {};
  const names = Object.keys(definitions);
  const connections = [...ids].flatMap(id => {
    const match = id.match(/^(.*?)\((.+) (?:<->|->|<-|--) (.+)\)\[(\d+)\]$/);
    return match ? [{id, from: match[1] + match[2], to: match[1] + match[3], occurrence: Number(match[4])}] : [];
  });
  const edges = names.map(name => {
    const definition = definitions[name];
    if (typeof definition === 'string') return definition;
    if (!definition?.from || !definition?.to) throw new Error(`Connection ${name}: provide from and to node IDs.`);
    const matches = connections.filter(connection => connection.from === definition.from && connection.to === definition.to
      && (definition.occurrence === undefined || connection.occurrence === definition.occurrence));
    if (matches.length !== 1) throw new Error(`Connection ${name}: ${matches.length ? 'ambiguous' : 'missing'} ${definition.from} -> ${definition.to}. ${matches.length ? 'Set occurrence to the D2 connection index (starting at 0).' : 'Check the node IDs and diagram source.'}`);
    return matches[0].id;
  });
  const transition = value => {
    if (value.edge === undefined || Number.isInteger(value.edge)) return value;
    const edge = names.indexOf(value.edge);
    if (edge < 0) throw new Error(`Unknown connection name: ${value.edge}`);
    return {...value, edge};
  };
  return {...content, edges, steps: content.steps.map(step => ({...step,
    ...(step.next ? {next: Array.isArray(step.next) ? step.next.map(transition) : transition(step.next)} : {}),
    ...(step.choices ? {choices: step.choices.map(transition)} : {}),
  }))};
}

// The compiled diagram is the source of truth for labels on real edges.
export function bindChoiceLabels(content, labels) {
  const normalize = text => text.replaceAll('`', '').replace(/\s+/g, ' ').trim();
  return {...content, steps: content.steps.map(step => ({...step,
    ...(step.choices ? {choices: step.choices.map(choice => {
      if (choice.edge === undefined) return choice;
      const label = labels.get(content.edges[choice.edge]);
      const path = `steps.${step.id}.choices.${choice.id}`;
      if (!label) throw new Error(`${path}: choice edge needs a text label in diagram.d2.`);
      if (choice.label !== undefined && (typeof choice.label !== 'string' || normalize(choice.label) !== normalize(label)))
        throw new Error(`${path}.label: must match diagram edge text ${JSON.stringify(label)}. Omit label to use the edge text; put scenario details in summary or examples.`);
      return {...choice, label};
    })} : {}),
  }))};
}
