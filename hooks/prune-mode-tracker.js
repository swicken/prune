#!/usr/bin/env node
// prune — UserPromptSubmit hook to track which prune mode is active
// Inspects user input for /prune commands and writes mode to flag file

const { writeDefaultMode, isDeactivationCommand } = require('./prune-config');
const { getPruneInstructions } = require('./prune-instructions');
const { clearMode, readMode, setMode, writeHookOutput } = require('./prune-runtime');

let input = '';
let done = false;

function finish() {
  if (done) return;
  done = true;
  try {
    // Strip UTF-8 BOM some shells prepend when piping (breaks JSON.parse)
    const data = JSON.parse(input.replace(/^\uFEFF/, ''));
    const prompt = (data.prompt || '').trim().toLowerCase();

    // Match /prune commands
    if (/^[/@$]prune/.test(prompt)) {
      const parts = prompt.split(/\s+/);
      const cmd = parts[0].replace(/^[@$]/, '/');
      const arg = parts[1] || '';

      let mode = null;

      if (cmd === '/prune-review' || cmd === '/prune:prune-review') {
        mode = 'review';
      } else if (cmd === '/prune' || cmd === '/prune:prune') {
        // `/prune default <mode>` persists across sessions; plain switches
        // stay session-scoped, so this is the only path that writes config.
        if (arg === 'default') {
          let dmode;
          try { dmode = writeDefaultMode(parts[2]); } catch (error) {
            writeHookOutput('UserPromptSubmit', readMode() || 'off', 'PRUNE DEFAULT NOT SAVED: ' + error.message);
            return;
          }
          if (dmode) {
            writeHookOutput('UserPromptSubmit', readMode() || 'off', 'PRUNE DEFAULT SET — new sessions start in ' + dmode + '.');
          }
          return;
        }
        if (arg === 'lite') mode = 'lite';
        else if (arg === 'full') mode = 'full';
        else if (arg === 'ultra') mode = 'ultra';
        else if (arg === 'off') mode = 'off';
        else if (arg === '') {
          // Bare /prune reports the active level, doesn't reset it.
          const current = readMode() || 'off';
          writeHookOutput('UserPromptSubmit', current, 'PRUNE MODE ACTIVE — level: ' + current);
          return;
        } else return;
      }

      if (mode && mode !== 'off') {
        setMode(mode);
        // Re-inject the ruleset filtered to the new level. SessionStart only loaded
        // the startup level, so without this a mid-session switch moves the badge but
        // not the rules the model actually sees.
        writeHookOutput(
          'UserPromptSubmit',
          mode,
          'PRUNE MODE CHANGED — level: ' + mode + '\n\n' + getPruneInstructions(mode),
        );
        return;
      } else if (mode === 'off') {
        clearMode();
        writeHookOutput('UserPromptSubmit', 'off', 'PRUNE MODE OFF');
        return;
      }
    }

    // Deactivate only on a standalone phrase — mentioning "stop prune"
    // mid-sentence ("don't stop prune") must not kill the mode.
    if (isDeactivationCommand(prompt)) {
      clearMode();
      writeHookOutput('UserPromptSubmit', 'off', 'PRUNE MODE OFF');
    }
  } catch (e) {
    // Silent fail
  }
}

process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', finish);
// Never hang the session on a swallowed pipe: recover on error or timeout.
process.stdin.on('error', finish);
setTimeout(finish, 2000).unref();
