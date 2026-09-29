const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const files = ['package.json', '.claude-plugin/plugin.json', '.codex-plugin/plugin.json', 'gemini-extension.json'];
const versions = files.map(file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')).version);
if (versions.some(v => !/^\d+\.\d+\.\d+$/.test(v)) || new Set(versions).size !== 1) {
  throw new Error('Release versions must agree: ' + files.map((f, i) => f + '=' + versions[i]).join(', '));
}
if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME !== 'v' + versions[0]) {
  throw new Error('Release tag does not match ' + versions[0]);
}
console.log('Release manifests aligned at ' + versions[0]);
