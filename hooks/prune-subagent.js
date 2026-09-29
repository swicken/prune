#!/usr/bin/env node
// prune — SubagentStart hook
//
// SessionStart context is parent-thread only and never reaches subagents, so
// without this every Task-spawned agent runs prune-unaware. When a mode is
// active, inject the same ruleset into each subagent.
//
// prune: injects into every subagent, no stdin read — synchronous and
// stall-proof. Per-agent-type scoping when someone actually needs it.

const { getPruneInstructions } = require('./prune-instructions');
const { readMode, writeHookOutput } = require('./prune-runtime');

const mode = readMode();
if (mode && mode !== 'off') {
  try {
    writeHookOutput('SubagentStart', mode, getPruneInstructions(mode));
  } catch (e) {
    // Silent fail — a stdout error must not surface as a hook failure.
  }
}
