# Content format

Each walkthrough supplies content.js, diagram.d2, and generated diagram.svg. The web interface handles rendering and navigation. Content modules export trusted local JavaScript; they must not execute product code or call external services.

Export an object from `content.js`:

```js
export default {
  id: 'order-fulfillment',
  title: 'Order fulfillment',
  diagram: './diagram.svg',
  start: 'received',
  initial: {},
  edges: ['(shop.order -> warehouse.stock)[0]'],
  steps: [
    {
      id: 'received',
      title: 'Order received',
      explanation: 'The order contains 3 units.',
      highlight: 'shop.order',
      examples: [{data: {quantity: 3}}],
      next: {to: 'stock', edge: 0},
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

`highlight` is a D2 node ID. `edges` lists decoded D2 connection IDs; transitions use their array indices. Decode the generated SVG with `diagramIds` from this skill's `assets/d2/diagram.js` to inspect IDs, including D2's scoped connection notation. IDs are checked against the SVG rather than matched by drawing order.

A step has either `next` or `choices`. Omit both for an end state. Choices have stable `id`, `label`, `summary`, `alternative`, `to`, and optional `edge`, `examples`, and `updates` fields. `alternative` completes “See what would've happened if…” at the end of a path.

`title`, `explanation`, `examples`, `reasons`, choice `summary`, and transition `updates` can be literal values or functions of the current state. Keep these functions pure. Return new state fields from `updates`; do not mutate history or call external services.

For conditional navigation, `next` can be an array of transitions with `when: state => condition`. The first matching transition wins. Put an unconditional fallback last. Keep every target explicit so validation can inspect it without executing business logic.

Examples support `data` for JSON, `facts` for labeled values, `text`, and `paragraphs`. Add `disclosure` to put content inside a native expandable section. The interface supplies gray containers.

Use a unique example `id`. Saved progress uses that ID unless `storageKey` is supplied. Change the storage key when state changes are incompatible. Keep existing keys when moving files to preserve progress.

## Source references

Store repository-relative paths in a `sources` field, for example:

```js
sources: {
  repository: 'warehouse-app',
  paths: ['src/orders/submit.ts', 'src/inventory/reserve.ts'],
}
```

Steps may also carry `sources` metadata for their specific implementation. This metadata supports source inspection; structural validation does not verify it against the product code.
