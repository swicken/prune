process.stdout.on('error', error => { if (error.code !== 'EPIPE') throw error; });
const fs = require('fs');
const path = require('path');
const { getClaudeDir } = require('./prune-config');

const isCodex = Boolean(process.env.PLUGIN_DATA);
const statePath = isCodex
  ? path.join(process.env.PLUGIN_DATA, '.prune-active')
  : path.join(getClaudeDir(), '.prune-active');

function setMode(mode) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, mode);
}

function clearMode() {
  try { fs.unlinkSync(statePath); } catch (e) {}
}

// Live mode written by activate/mode-tracker. Absent flag = prune off.
function readMode() {
  try {
    return fs.readFileSync(statePath, 'utf8').trim() || null;
  } catch (e) {
    return null;
  }
}

function writeHookOutput(event, mode, context = '') {
  if (!isCodex) {
    process.stdout.write(event === 'SubagentStart'
      ? JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: context } })
      : context);
    return;
  }
  const output = { systemMessage: `PRUNE:${mode.toUpperCase()}` };
  if (context) {
    output.hookSpecificOutput = {
      hookEventName: event,
      additionalContext: context,
    };
  }
  process.stdout.write(JSON.stringify(output));
}

module.exports = {
  clearMode,
  isCodex,
  readMode,
  setMode,
  writeHookOutput,
};
