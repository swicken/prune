#!/usr/bin/env node
// prune — shared configuration resolver
//
// Resolution order for default mode:
//   1. PRUNE_DEFAULT_MODE environment variable
//   2. Config file defaultMode field:
//      - $XDG_CONFIG_HOME/prune/config.json (any platform, if set)
//      - ~/.config/prune/config.json (macOS / Linux fallback)
//      - %APPDATA%\prune\config.json (Windows fallback)
//   3. 'full'

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_MODE = 'full';
const VALID_MODES = ['off', 'lite', 'full', 'ultra', 'review'];
const RUNTIME_MODES = ['off', 'lite', 'full', 'ultra'];

function normalizeMode(mode) {
  if (typeof mode !== 'string') return null;
  const normalized = mode.trim().toLowerCase();
  return RUNTIME_MODES.includes(normalized) ? normalized : null;
}

function normalizeConfigMode(mode) {
  if (typeof mode !== 'string') return null;
  const normalized = mode.trim().toLowerCase();
  return VALID_MODES.includes(normalized) ? normalized : null;
}

function normalizePersistedMode(mode) {
  return normalizeMode(mode) || normalizeConfigMode(mode);
}

function getConfigDir() {
  if (process.env.XDG_CONFIG_HOME) {
    return path.join(process.env.XDG_CONFIG_HOME, 'prune');
  }
  if (process.platform === 'win32') {
    return path.join(
      process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
      'prune'
    );
  }
  return path.join(os.homedir(), '.config', 'prune');
}

function getConfigPath() {
  return path.join(getConfigDir(), 'config.json');
}

function getDefaultMode() {
  // 1. Environment variable (highest priority)
  const envMode = normalizeMode(process.env.PRUNE_DEFAULT_MODE);
  if (envMode) return envMode;

  // 2. Config file
  try {
    const configPath = getConfigPath();
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, ''));
    const mode = normalizeMode(config?.defaultMode);
    if (mode) return mode;
  } catch (e) {
    // Config file doesn't exist or is invalid — fall through
  }

  // 3. Default
  return DEFAULT_MODE;
}

function getClaudeDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

function isDeactivationCommand(text) {
  return typeof text === 'string' && /^["']?(stop prune|normal mode)["']?[.!?]*$/i.test(text.trim());
}

function isShellSafe(value) {
  return typeof value === 'string' && /^[A-Za-z0-9 _.\-:/\\~]+$/.test(value);
}

function writeDefaultMode(mode) {
  const normalized = normalizeMode(mode);
  if (!normalized) return null;
  const configPath = getConfigPath();
  let config = {};
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, ''));
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      throw new Error('Prune config must be a JSON object; original file preserved.');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  config.defaultMode = normalized;
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  const temp = fs.mkdtempSync(path.join(path.dirname(configPath), '.prune-'));
  try {
    const staged = path.join(temp, 'config.json');
    fs.writeFileSync(staged, JSON.stringify(config, null, 2) + '\n', 'utf8');
    fs.renameSync(staged, configPath);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
  return normalized;
}

module.exports = {
  DEFAULT_MODE,
  getClaudeDir,
  isDeactivationCommand,
  isShellSafe,
  VALID_MODES,
  RUNTIME_MODES,
  getDefaultMode,
  getConfigDir,
  getConfigPath,
  normalizeMode,
  normalizeConfigMode,
  normalizePersistedMode,
  writeDefaultMode,
};
