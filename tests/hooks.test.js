#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');

function run(script, env, input = '') {
  return spawnSync(process.execPath, [path.join(root, 'hooks', script)], {
    env: { ...process.env, ...env },
    input,
    encoding: 'utf8',
  });
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'prune-hooks-'));
const home = path.join(temp, 'home');
const pluginData = path.join(temp, 'plugin-data');
fs.mkdirSync(home, { recursive: true });

// USERPROFILE alongside HOME: os.homedir() reads USERPROFILE on Windows, HOME on POSIX.
const codexEnv = {
  HOME: home,
  USERPROFILE: home,
  PLUGIN_DATA: pluginData,
  PRUNE_DEFAULT_MODE: 'ultra',
};
const codexState = path.join(pluginData, '.prune-active');

let result = run('prune-activate.js', codexEnv);
assert.equal(result.status, 0, result.stderr);
assert.equal(fs.readFileSync(codexState, 'utf8'), 'ultra');
let output = JSON.parse(result.stdout);
assert.equal(output.systemMessage, 'PRUNE:ULTRA');
assert.match(
  output.hookSpecificOutput.additionalContext,
  /PRUNE MODE ACTIVE — level: ultra/,
);

result = run(
  'prune-mode-tracker.js',
  codexEnv,
  JSON.stringify({ prompt: '@prune lite' }),
);
assert.equal(result.status, 0, result.stderr);
assert.equal(fs.readFileSync(codexState, 'utf8'), 'lite');
output = JSON.parse(result.stdout);
assert.equal(output.systemMessage, 'PRUNE:LITE');
// A mid-session switch must re-inject the ruleset filtered to the new level,
// not just flip the badge. "mention a materially simpler alternative" is lite-only text.
assert.match(
  output.hookSpecificOutput.additionalContext,
  /PRUNE MODE CHANGED — level: lite/,
);
assert.match(
  output.hookSpecificOutput.additionalContext,
  /mention a materially simpler alternative/,
);

// Bare /prune reports the active level without resetting it (default is
// ultra here; the live mode is lite and must survive).
result = run(
  'prune-mode-tracker.js',
  codexEnv,
  JSON.stringify({ prompt: '/prune' }),
);
assert.equal(result.status, 0, result.stderr);
assert.equal(fs.readFileSync(codexState, 'utf8'), 'lite');
output = JSON.parse(result.stdout);
assert.match(
  output.hookSpecificOutput.additionalContext,
  /PRUNE MODE ACTIVE — level: lite/,
);

// "stop prune" mid-sentence must NOT deactivate.
result = run(
  'prune-mode-tracker.js',
  codexEnv,
  JSON.stringify({ prompt: "please don't stop prune here" }),
);
assert.equal(result.status, 0, result.stderr);
assert.equal(fs.readFileSync(codexState, 'utf8'), 'lite');
assert.equal(result.stdout, '');

// /prune default <mode> persists to the config file, leaves the live mode alone.
result = run(
  'prune-mode-tracker.js',
  { ...codexEnv, XDG_CONFIG_HOME: path.join(temp, 'xdg') },
  JSON.stringify({ prompt: '/prune default full' }),
);
assert.equal(result.status, 0, result.stderr);
assert.equal(fs.readFileSync(codexState, 'utf8'), 'lite');
assert.deepEqual(
  JSON.parse(fs.readFileSync(path.join(temp, 'xdg', 'prune', 'config.json'), 'utf8')),
  { defaultMode: 'full' },
);
output = JSON.parse(result.stdout);
assert.equal(output.systemMessage, 'PRUNE:LITE');
assert.match(
  output.hookSpecificOutput.additionalContext,
  /PRUNE DEFAULT SET/,
);

// SubagentStart injects the active ruleset into spawned agents.
result = run('prune-subagent.js', codexEnv);
assert.equal(result.status, 0, result.stderr);
output = JSON.parse(result.stdout);
assert.equal(output.systemMessage, 'PRUNE:LITE');
assert.match(
  output.hookSpecificOutput.additionalContext,
  /mention a materially simpler alternative/,
);

result = run(
  'prune-mode-tracker.js',
  codexEnv,
  JSON.stringify({ prompt: 'normal mode' }),
);
assert.equal(result.status, 0, result.stderr);
assert.equal(fs.existsSync(codexState), false);
output = JSON.parse(result.stdout);
assert.equal(output.systemMessage, 'PRUNE:OFF');

// Status after explicit off must stay off, not report the startup default.
result = run('prune-mode-tracker.js', codexEnv, JSON.stringify({ prompt: '/prune' }));
assert.equal(result.status, 0, result.stderr);
assert.equal(JSON.parse(result.stdout).systemMessage, 'PRUNE:OFF');
assert.equal(fs.existsSync(codexState), false);

// No active mode → SubagentStart injects nothing.
result = run('prune-subagent.js', codexEnv);
assert.equal(result.status, 0, result.stderr);
assert.equal(result.stdout, '');

const claudeEnv = {
  HOME: home,
  USERPROFILE: home,
  PRUNE_DEFAULT_MODE: 'full',
};
delete claudeEnv.PLUGIN_DATA;

result = run('prune-activate.js', claudeEnv);
assert.equal(result.status, 0, result.stderr);
assert.equal(
  fs.readFileSync(path.join(home, '.claude', '.prune-active'), 'utf8'),
  'full',
);

fs.rmSync(temp, { recursive: true, force: true });
console.log('hook compatibility checks passed');
