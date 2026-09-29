// prune — OpenCode plugin.
//
// Injects the prune ruleset into every chat's system prompt at the active
// intensity, and persists /prune mode switches. Reuses the shared instruction
// builder so Claude Code, Codex, pi, and OpenCode all read one source of truth.
//
// OpenCode loads this as a server plugin — add it to your opencode.json:
//   { "plugin": ["./.opencode/plugins/prune.mjs"] }

import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';

// The shared instruction builder is CommonJS; bridge to it from this ES module.
const require = createRequire(import.meta.url);
const { getPruneInstructions } = require('../../hooks/prune-instructions');
const { getDefaultMode, normalizePersistedMode } = require('../../hooks/prune-config');

// OpenCode has no flag-file convention of its own; keep mode beside its config.
const statePath = path.join(
  process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
  'opencode',
  '.prune-active',
);

function readMode() {
  try {
    return normalizePersistedMode(fs.readFileSync(statePath, 'utf8').trim()) || getDefaultMode();
  } catch (e) {
    return getDefaultMode();
  }
}

function writeMode(mode) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, mode);
}

export default async ({ client } = {}) => {
  const log = (level, message) => {
    try { client && client.app && client.app.log({ body: { service: 'prune', level, message } }); } catch (e) {}
  };

  return {
    // Append the ruleset to the system prompt every turn.
    'experimental.chat.system.transform': async (_input, output) => {
      const mode = readMode();
      if (mode === 'off') return;
      output.system.push(getPruneInstructions(mode));
    },

    // Persist `/prune <level>` so the next turn's injection follows it.
    // prune: mode applies from the next message, not the current one — the
    // transform reads the flag the command writes. Good enough; switch to a
    // synchronous store if same-turn switching ever matters.
    'command.execute.before': async (input) => {
      if (!input || input.command !== 'prune') return;
      // `off` is persisted like any mode; the transform reads it and stays silent.
      // Bare or invalid arguments must not clobber the active level (also guards
      // non-string arguments — normalizePersistedMode type-checks).
      const mode = normalizePersistedMode(input.arguments);
      if (!mode) return;
      writeMode(mode);
      log('info', 'prune ' + mode);
    },
  };
};
