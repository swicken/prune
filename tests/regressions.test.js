const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
test('shared adapter regression contracts pass', () => {
  const root = path.join(__dirname, '..');
  const p = spawnSync(process.execPath, [path.join(root,'benchmarks/adapters.cjs'),root,'prune'],{encoding:'utf8'});
  assert.equal(p.status,0,p.stderr);
  const rows=JSON.parse(p.stdout);
  for (const [name,row] of Object.entries(rows)) assert.equal(row.pass,true,name+': '+row.reason);
});
