#!/usr/bin/env node
// prune — Claude Code SessionStart activation hook
//
// Runs on every session start:
//   1. Writes flag file at ~/.claude/.prune-active (statusline reads this)
//   2. Emits prune ruleset as hidden SessionStart context
//   3. Detects missing statusline config and emits setup nudge

const fs = require('fs');
const path = require('path');
const { getDefaultMode, getClaudeDir, isShellSafe } = require('./prune-config');
const { getPruneInstructions } = require('./prune-instructions');
const {
  clearMode,
  isCodex,
  setMode,
  writeHookOutput,
} = require('./prune-runtime');

const claudeDir = getClaudeDir();
const settingsPath = path.join(claudeDir, 'settings.json');

const mode = getDefaultMode();

// "off" mode — skip activation entirely, don't write flag or emit rules
if (mode === 'off') {
  clearMode();
  writeHookOutput('SessionStart', 'off', isCodex ? '' : 'OK');
  process.exit(0);
}

// 1. Write flag file
try {
  setMode(mode);
} catch (e) {
  // Silent fail -- flag is best-effort, don't block the hook
}

// 2. Emit the prune ruleset, filtered to the active intensity level.
let output = getPruneInstructions(mode);

// 3. Detect missing statusline config — nudge Claude to help set it up
if (!isCodex) try {
  let hasStatusline = false;
  if (fs.existsSync(settingsPath)) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8').replace(/^\uFEFF/, ''));
    if (settings.statusLine) {
      hasStatusline = true;
    }
  }

  if (!hasStatusline) {
    const isWindows = process.platform === 'win32';
    const scriptName = isWindows ? 'prune-statusline.ps1' : 'prune-statusline.sh';
    const scriptPath = path.join(__dirname, scriptName);
    if (!isShellSafe(scriptPath)) {
      output += '\nStatusline setup: configure the Prune script manually; its path needs shell-specific escaping.';
      writeHookOutput('SessionStart', mode, output);
      process.exit(0);
    }
    const command = isWindows
      ? `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`
      : `bash "${scriptPath}"`;
    const statusLineSnippet =
      '"statusLine": { "type": "command", "command": ' + JSON.stringify(command) + ' }';
    output += "\n\n" +
      "STATUSLINE SETUP NEEDED: The prune plugin includes a statusline badge showing active mode " +
      "(e.g. [PRUNE], [PRUNE:ULTRA]). It is not configured yet. " +
      "To enable, add this to " + settingsPath + ": " +
      statusLineSnippet + " " +
      "Proactively offer to set this up for the user on first interaction.";
  }
} catch (e) {
  // Silent fail — don't block session start over statusline detection
}

writeHookOutput('SessionStart', mode, output);
