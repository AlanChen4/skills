# Authoring a walkthrough

## Investigate

Choose a clear start and end (e.g. an order is submitted and shipment is booked or declined). Trace the actual implementation, including configuration, background jobs, database operations, external services, and human actions where relevant.

Include an action or branch only if it helps explain the requested workflow at its intended depth. Omit routine authentication, parsing, logging, and bookkeeping unless they affect an outcome relevant to that scope.

Check the exact conditions, thresholds, and early exits behind each decision. Follow calls across files instead of inferring behavior from names. Read local repository instructions before investigating.

Create scenarios for meaningful branches and boundaries (e.g. available stock exactly covers the requested quantity). Include failure handling when it changes the outcome. Use fixed example responses for AI and external services; distinguish these supplied responses from deterministic application rules.

State unknowns, such as third-party behavior absent from the source. Do not imply that deployment configuration or live service behavior was verified by reading code.

## Explain

- Prefer short bullet points over long paragraphs. Use numbered lists when order matters. Keep diagram labels brief without adding step numbers.
- Write in ASD-STE100 style: use common, precise words, active voice, and one action or fact per sentence. Use the same term for the same thing, and preserve technical names and exact business conditions.
- Avoid decorative dot separators (such as · and •) and em dashes in normal text. Native list markers and punctuation within exact names, code, and quoted data are allowed.
- Explain business rules and application behavior. Focus each step on what happens now.
- Omit introductory filler, navigation prompts, previews of later steps, and commentary about the visualization or use of fictional examples.
- Make each choice focus on one condition or event (e.g. “Payment declined”). State shared context once in the step, and keep necessary inputs in example data. Do not combine setup, action, and outcome in one option; explain the result after selection.
- At decision outcomes, list the specific reasons. Connect actual inputs to conditions and thresholds (e.g. 3 units requested exceeds 1 available).
- Distinguish deterministic rules, AI judgments, and human decisions. Explain human overrides with their stated reasons.
- Use realistic fictional examples in the expected formats (e.g. version 4 UUIDs and Base64 signatures). Keep names and identifiers consistent across steps.
- Use full names unless an abbreviation is widely established, such as AWS. Write “Customer Support” instead of “Cust. Sup.”
- Put function names, table names, model versions, and payload formats in supporting text or examples unless those details are the subject of the diagram.

## Draw

- Map every step to the specific process, decision, or resource it explains. Show each meaningful operation at the chosen level of detail. Combine implementation steps that serve one purpose, such as preparing, sending, and validating a model request. Label its edge with the action (e.g. “Start job” or “Read report history”). Merge text-only steps that add no diagram transition. Reuse shared resources, but distinguish the processes that use them. Let the diagram carry the action; use prose for conditions, reasons, and examples.
- For complex flows, group related steps to show their relationships. Avoid basic grids.
- Organize the diagram around process order. Group by hosting provider only when infrastructure or ownership is the subject.
- Name process nodes with an action (e.g. “Collect metrics”). Phrase decision nodes as questions (e.g. “Does today’s report already exist?”). Avoid internal identifiers as primary labels.
- Merge an action and its obvious completion (e.g. “Format message” and “Message formatted”) unless the distinction affects behavior.
- End paths with concrete results (e.g. “Report delivered” or “Existing data preserved”). Combine paths that reach the same outcome when their differences are outside the scope.
- Name services and interfaces specifically (e.g. “Stripe Payments API” instead of “External service”).
- Show each shared resource once. Label connections with operations (e.g. one inventory database with “Check stock” and “Reserve items” arrows).
- Distinguish people, processes, decisions, databases, and AI with shapes (e.g. person, rectangle, diamond, cylinder, and hexagon).
- Keep person shapes near their natural proportions. Put long labels outside the silhouette; use width 96 and height 108 when automatic sizing distorts it. Keep automatic layout for node positions.
- Use automatic layout with modest group padding. Avoid manual placement and fixed dimensions that create unused space. Keep arrows clear of labels and group titles.
- Use one cohesive diagram that explains the selected workflow from start to finish. Exclude adjacent workflows, development setup, and evaluation machinery unless requested.
