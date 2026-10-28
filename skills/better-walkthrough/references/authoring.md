# Authoring a walkthrough

## Investigate

Choose a clear start and end (e.g. an order is submitted and shipment is booked or declined). Trace the actual implementation, including configuration, background jobs, database operations, external services, and human actions where relevant.

Check the exact conditions, thresholds, and early exits behind each decision. Follow calls across files instead of inferring behavior from names. Read local repository instructions before investigating.

Create scenarios for meaningful branches and boundaries (e.g. available stock exactly covers the requested quantity). Include failure handling when it changes the outcome. Use fixed example responses for AI and external services; distinguish these supplied responses from deterministic application rules.

Store repository-relative source paths with the walkthrough. Step-level source references help connect decisions to their implementation. State unknowns, such as third-party behavior absent from the source. Do not imply that deployment configuration or live service behavior was verified by reading code.

## Explain

- Do not number list items or diagram steps.
- Use clear language. Keep reusable guidance and its examples independent of a specific product.
- Explain business rules and application behavior. Focus each step on what happens now.
- Omit introductory filler, navigation prompts, previews of later steps, and commentary about the visualization or use of fictional examples.
- At decision outcomes, list the specific reasons. Connect actual inputs to conditions and thresholds (e.g. 3 units requested exceeds 1 available).
- Distinguish deterministic rules, AI judgments, and human decisions. Explain human overrides with their stated reasons.
- Use realistic fictional examples in the expected formats (e.g. version 4 UUIDs and Base64 signatures). Keep names and identifiers consistent across steps.
- Use full names unless an abbreviation is widely established, such as AWS. Write “Customer Support” instead of “Cust. Sup.”

## Draw

- For complex flows, group related steps to show their relationships. Avoid basic grids.
- Default to grouping by hosting provider (e.g. AWS, Google Cloud, Salesforce). Use another grouping when it explains the process better.
- Name services and interfaces specifically (e.g. “Stripe Payments API” instead of “External service”).
- Show each shared resource once. Label connections with operations (e.g. one inventory database with “Check stock” and “Reserve items” arrows).
- Distinguish people, processes, decisions, databases, and AI with shapes (e.g. person, rectangle, diamond, cylinder, and hexagon).
- Keep person shapes near their natural proportions. Put long labels outside the silhouette; use width 96 and height 108 when automatic sizing distorts it. Keep automatic layout for node positions.
- Use automatic layout with modest group padding. Avoid manual placement and fixed dimensions that create unused space. Keep arrows clear of labels and group titles.
- Use one complete diagram for the workflow. Keep positions and scale stable between steps, reveal the selected path, and dim earlier items that are no longer relevant.

## Use the shared interface

Keep native HTML controls and the existing interface structure. The bordered text column stays on the left, with the diagram on the right and independent scrolling. Example data belongs in light gray containers. Omit redundant diagram headings and captions.

Use manual Back and Next navigation and concrete choices. Previously selected choices remain available at lower opacity. Show unexplored alternatives only at the end of a path, when there is no Next action or pending choice. Use one “See what would've happened if…” introduction followed by bulleted scenario links.

Exploration counts unique choices selected across all decision steps, including steps not yet reached. At 100%, the progress text turns green and Restart appears above Next. Preserve progress across refreshes and reload source changes during development.

Preserve existing example behavior and saved progress when reorganizing files. Reuse these behaviors rather than implementing a separate interface for each product. Keep live service calls and credentials out of scenario content.
