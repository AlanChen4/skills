---
name: better-codex-superfan
license: MIT
description: Run a recurring task with codex goals, sleeping between runs. Workaround for [this](https://github.com/openai/codex/issues/34946).
---

# Better Codex Superfan

Use this skill when the user wants a task repeated on a schedule in the current Codex session.

## Prepare

Establish the task, schedule, timezone, and stopping condition. Ask only for missing details that affect execution.

Check whether the Codex session and shell can remain available for the full wait, and whether the runtime can resume after a shell command completes. Before starting, explain any runtime limit that prevents a full wait or requires frequent model polling. Do not promise automatic resumption unless the host supports it.

When the user asks to start, create one goal for the full recurring task. Keep it active between runs. Complete it only when its stopping condition is met. Honor user stops and runtime limits.

## Run and wait

1. Check the current time. Run the task when it is due and verify the result. If several runs were missed, run once and return to the schedule.
2. Record the result and the next run time in the chat. If the first run is in the future, record that next run time before waiting.
3. Calculate the seconds until the next run. Start one shell `sleep` for the full gap, including gaps of 24 hours (`sleep 86400`). Let the tool call yield while the command keeps running.
4. Use a completion notification to resume when the command finishes, if the runtime supports it. Avoid periodic model turns, time checks, and status messages while waiting.
5. Check the time after waking, then repeat.

Shell sleep cannot restart a stopped session.
