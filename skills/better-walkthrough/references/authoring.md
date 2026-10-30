# Authoring a walkthrough

## Investigate

- Read repository instructions. Define one workflow's start, end, and depth.
- Trace calls across files, including relevant configuration, jobs, data operations, services, and human actions.
- Check exact conditions, thresholds, and early exits. Include routine operations only when they affect an outcome within scope.
- Cover meaningful branches, boundary values, and failures that change the result.
- Supply fixed AI and service responses for scenarios. Distinguish them from deterministic rules.
- State unknown behavior. Reading code does not verify deployment or live services.

## Explain

- Use brief bullets, or numbered lists when order matters. Keep labels short and omit step numbers.
- Use common, precise words, active voice, and one action or fact per sentence. Keep terms consistent and preserve exact conditions.
- Omit filler, navigation prompts, previews, and commentary about the diagram or fictional examples.
- Focus each step on the current behavior. Explain outcome reasons with inputs and thresholds, such as 3 units requested and 1 available.
- Give each choice one condition or event. Put shared context in the step and inputs in examples; explain the result after selection.
- Distinguish deterministic rules, AI judgments, and human decisions. Give stated reasons for overrides.
- Use realistic fictional values in the expected formats, such as version 4 UUIDs and Base64 signatures. Keep identifiers consistent.
- Use full names except established abbreviations such as AWS.
- Put code names, versions, and payload formats in supporting text unless they are the diagram's subject.
- Avoid decorative dot separators and em dashes. Preserve punctuation in exact names, code, and quotations.

## Draw

- Map each step to its process, decision, or resource. Combine operations that serve one purpose and merge text-only steps.
- Arrange one cohesive diagram in process order. Exclude adjacent workflows, setup, and evaluation unless requested.
- Group related steps in complex flows. Group by provider only when ownership or infrastructure is the subject.
- Name processes with actions, decisions with questions, and endpoints with concrete results. Use specific service names.
- Merge an action and its obvious completion unless the distinction changes behavior. Combine equivalent outcomes within scope.
- Show shared resources once. Label connections with operations and distinguish the processes that use them.
- Use distinct shapes for people, processes, decisions, databases, and AI, such as person, rectangle, diamond, cylinder, and hexagon.
- Keep person shapes proportional and long labels outside them. Use width 96 and height 108 if automatic sizing distorts a person.
- Use automatic layout and modest group padding. Avoid fixed positions and dimensions that create empty space; keep arrows clear of labels and titles.
