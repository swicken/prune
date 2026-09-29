const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const powershell = process.platform === 'win32' ? 'powershell' : 'pwsh';
const hasPowerShell = !spawnSync(powershell, ['-NoProfile', '-Command', 'exit 0']).error;
for (const shell of ['bash', powershell]) {
  test(`${shell} statusline reads the Claude override`, { skip: (shell === powershell && !hasPowerShell) || (shell === 'bash' && process.platform === 'win32') }, () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'prune-statusline-'));
    try {
      const custom = path.join(temp, 'custom');
      fs.mkdirSync(custom);
      fs.writeFileSync(path.join(custom, '.prune-active'), 'ultra\n');
      const args = shell === 'bash' ? [path.join(root, 'hooks/prune-statusline.sh')] : ['-NoProfile', '-File', path.join(root, 'hooks/prune-statusline.ps1')];
      const p = spawnSync(shell, args, { env: { ...process.env, HOME: temp, CLAUDE_CONFIG_DIR: custom }, encoding: 'utf8' });
      assert.equal(p.status, 0, p.stderr);
      assert.match(p.stdout, /\[PRUNE:ULTRA\]/);
    } finally { fs.rmSync(temp, { recursive: true, force: true }); }
  });
}
test('PowerShell manifest commands actually execute', { skip: !hasPowerShell }, () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'prune-windows-hook-'));
  try {
    const config = JSON.parse(fs.readFileSync(path.join(root, 'hooks/hooks.json'), 'utf8'));
    for (const event of Object.values(config.hooks)) for (const entry of event) for (const hook of entry.hooks) {
      if (!hook.commandWindows) continue;
      const p = spawnSync(powershell, ['-NoProfile', '-Command', hook.commandWindows], { input: '{}', encoding: 'utf8', timeout: 10000, env: { ...process.env, CLAUDE_PLUGIN_ROOT: root, CLAUDE_CONFIG_DIR: temp, XDG_CONFIG_HOME: temp, PRUNE_DEFAULT_MODE: 'full' } });
      assert.equal(p.status, 0, p.stderr);
      assert.ok(p.stdout.trim(), hook.commandWindows);
    }
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
