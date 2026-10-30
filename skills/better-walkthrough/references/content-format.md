# Content format

- Write content.js and diagram.d2. The build generates diagram.svg and index.html.
- Content modules contain trusted local JavaScript. Keep credentials out; do not run product code or call services.
- Export a content object:

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

## Steps and connections

- `highlight` names a D2 node. Define named `edges` with fully qualified `from` and `to` node IDs, including groups.
- Reference the edge name in each transition. The viewer and validator resolve endpoints against the SVG; do not construct encoded or scoped D2 IDs manually.
- For repeated connections between the same endpoints, set `occurrence` to their zero-based source order. Missing or ambiguous connections fail validation.
- Legacy arrays of decoded D2 connection IDs and numeric references remain supported. Named edges can also use literal connection IDs for unusual syntax.
- A step uses `next`, `choices`, or neither for an end state.
- Every transition needs a real D2 edge matching the current and target highlights. Same-node loops need explicit self-edges. Merge extra explanation into the existing step.
- Keep `explanation` brief and put supporting bullets in `reasons`.
- Backticks style inline code. Other Markdown and HTML appear as plain text.

## Choices

- Supply stable `id`, `summary`, `alternative`, `to`, and `edge` fields. `label`, `examples`, and `updates` are optional.
- Omit `label` to use the D2 edge text. An explicit label must match it.
- Put scenario conditions in `summary` or `examples`.
- Choices on one route share its label and colored marker. Edge text stays unchanged after selection; destination nodes stay hidden until reached.
- Write `alternative` to complete “See what would've happened if…” at the end of a path.

```js
choices: [{
  id: 'declined-card',
  edge: 'paymentFailed', // D2 edge text: Payment declined
  summary: 'The bank declined the card.',
  alternative: 'the bank had declined the card',
  to: 'payment-error',
}]
```

## State and navigation

- `title`, `explanation`, `examples`, `reasons`, choice `summary`, and transition `updates` accept values or pure functions of state.
- Functions belong on these outer fields and `when`. Nested example values must be plain data.
- Return changed state fields from `updates`. Do not mutate history.
- For conditional navigation, use a `next` array with `when: state => condition`. The first match wins; put an unconditional fallback last.
- Keep targets explicit so validation can inspect them without running business logic.

## Examples

- Use `data` for JSON payloads and `facts` for a flat field/value table.
- Use `text` for short text or `paragraphs` for an array of text. Add `disclosure` for an expandable section.
- `data` must be JSON-compatible. `facts` values must be text, finite numbers, booleans, or null.
- For state-dependent examples, return the entire array:

```js
examples: state => [{data: {account: state.account}}]
```

- Do not put functions inside `data` or `facts`.
- Static validation checks literal examples without evaluating functions. It cannot verify function results.

## Saved progress

- Use a unique walkthrough `id`; it supplies the default storage key unless `storageKey` is set.
- Keep IDs, storage keys, and connection order stable when moving files to preserve progress at the same viewer origin.
- Change `storageKey` when state changes are incompatible.

## Source references

Store repository-relative paths in `sources` on the content object or individual steps:

```js
sources: {
  repository: 'warehouse-app',
  paths: ['src/orders/submit.ts', 'src/inventory/reserve.ts'],
}
```

Structural validation does not check these references against product code.
