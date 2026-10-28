# Content format

Each walkthrough supplies content.js, diagram.d2, and generated diagram.svg. The web interface handles rendering and navigation. Content modules export trusted local JavaScript; they must not execute product code or call external services. Keep credentials out of scenario data.

Export an object from `content.js`:

```js
export default {
  id: 'order-fulfillment',
  title: 'Order fulfillment',
  diagram: './diagram.svg',
  start: 'received',
  initial: {},
  edges: {
    checkStock: {from: 'shop.order', to: 'warehouse.stock'},
  },
  steps: [
    {
      id: 'received',
      title: 'Order received',
      explanation: 'The order contains 3 units.',
      highlight: 'shop.order',
      examples: [{data: {quantity: 3}}],
      next: {to: 'stock', edge: 'checkStock'},
    },
    {
      id: 'stock',
      title: 'Insufficient stock',
      explanation: 'Available stock cannot cover the order.',
      highlight: 'warehouse.stock',
      examples: [{data: {requested: 3, available: 1}}],
      reasons: ['The order requires 3 units; only 1 is available.'],
    },
  ],
};
```

`highlight` is a D2 node ID. Define `edges` with readable names and fully qualified `from` and `to` node IDs. Transitions use the connection name. The browser and validator resolve these endpoints against the compiled SVG, including connections within groups. Do not construct D2's encoded or scoped connection IDs by hand.

If D2 has several connections between the same endpoints, add `occurrence: 0` (or 1, 2, and so on) to select their order in the D2 source. Ambiguous or missing connections fail with an actionable error.

Existing `edges` arrays of decoded D2 connection IDs and numeric transition references remain supported. Named definitions may also use literal connection IDs for unusual D2 syntax.

A step has either `next` or `choices`. Omit both for an end state. Choices have stable `id`, `label`, `summary`, `alternative`, `to`, and optional `edge`, `examples`, and `updates` fields. The viewer uses each choice `label` for both its button and its temporary edge label. Choices that share an edge get separate labels and colored markers. Omit `edge` only when the target step has the same `highlight`; the viewer draws a temporary self-loop. Choices that move to another node require an edge.

`alternative` completes “See what would've happened if…” at the end of a path.

`title`, `explanation`, `examples`, `reasons`, choice `summary`, and transition `updates` can be literal values or functions of the current state. Keep these functions pure. Return new state fields from `updates`; do not mutate history or call external services.

For conditional navigation, `next` can be an array of transitions with `when: state => condition`. The first matching transition wins. Put an unconditional fallback last. Keep every target explicit so validation can inspect it without executing business logic.

Keep `explanation` brief. Put supporting points in `reasons`, which the interface renders as a bullet list, rather than joining them into a long paragraph.

Wrap code references in backticks (e.g. `check_stock`) for inline code styling in narrative text. Other Markdown and HTML are rendered as plain text.

Examples support `data` for JSON, `facts` for a two-column field/value table, `text`, and `paragraphs`. Use `facts` for flat values (e.g. `facts: {Target: 'r/catmakers', Schedule: '0 8 * * *'}`) and `data` for nested payloads or responses. Keep text short. Add `disclosure` to put content inside a native expandable section. The interface supplies gray containers.

Use a unique walkthrough `id`. Saved progress uses that ID unless `storageKey` is supplied. Keep IDs, storage keys, and connection order unchanged when moving files to preserve progress at the same viewer origin. Change the storage key when state changes are incompatible.

## Source references

Store repository-relative paths in a `sources` field, for example:

```js
sources: {
  repository: 'warehouse-app',
  paths: ['src/orders/submit.ts', 'src/inventory/reserve.ts'],
}
```

Steps may also carry `sources` metadata for their specific implementation. This metadata supports source inspection; structural validation does not verify it against the product code.
