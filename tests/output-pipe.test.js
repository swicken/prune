const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn } = require('node:child_process');

test('hook output survives a closed consumer pipe', async () => {
  const runtime = path.resolve(__dirname, '../hooks/prune-runtime.js');
  const child = spawn(process.execPath, ['-e', `require(${JSON.stringify(runtime)}).writeHookOutput('SessionStart','full','x'.repeat(1048576))`], { env: { ...process.env, PLUGIN_DATA: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.destroy();
  let stderr = '';
  child.stderr.on('data', chunk => stderr += chunk);
  const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
  assert.equal(code, 0, stderr);
});
