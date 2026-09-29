#!/usr/bin/env node
// AGENTS.md is the single source for the compact rule copies.
// Default: regenerate every host-specific copy from it.
// --check: verify they're in sync (for CI / pre-commit) without writing.
//
// prune: one source, copies generated — not the same rules hand-maintained
// in five places. Was check-rule-copies.js, which only verified the hand edits.

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const check = process.argv.includes('--check');

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8').replace(/\r\n/g, '\n');
}

const agents = read('AGENTS.md').trim();
// Body shared by every copy: AGENTS.md without the repo-only closing aside.
const canonical = agents.replace(/\n\n\(These rules also apply[\s\S]*?\)$/, '').trim();

// Each copy = host-specific frontmatter (or none) + the canonical body.
const FRONTMATTER = {
  '.cursor/rules/prune.mdc':
    '---\n' +
    'description: Prune, lazy senior dev mode. Always pick the simplest solution that works.\n' +
    'globs:\n' +
    'alwaysApply: true\n' +
    '---\n',
  '.windsurf/rules/prune.md': '',
  '.clinerules/prune.md': '',
  '.github/copilot-instructions.md': '',
  '.kiro/steering/prune.md':
    '---\n' +
    'title: Prune, lazy senior dev mode\n' +
    'inclusion: always\n' +
    '---\n',
};

const build = (frontmatter) => (frontmatter ? frontmatter + '\n' : '') + canonical + '\n';

let drifted = false;

for (const [relPath, frontmatter] of Object.entries(FRONTMATTER)) {
  const want = build(frontmatter);
  const abs = path.join(root, relPath);
  const have = fs.existsSync(abs) ? read(relPath) : null;
  if (have === want) continue;

  if (check) {
    console.error(`${relPath} is out of sync with AGENTS.md`);
    drifted = true;
  } else {
    fs.writeFileSync(abs, want);
    console.log(`wrote ${relPath}`);
  }
}

// Generate the fallback too: skill-loading failures retain the same guarantees.
const fallbackPath = path.join(root, 'hooks/prune-fallback.js');
const fallback = '// Generated from AGENTS.md by scripts/sync-rule-copies.js.\nmodule.exports = ' + JSON.stringify(canonical) + ';\n';
if (!fs.existsSync(fallbackPath) || fs.readFileSync(fallbackPath, 'utf8') !== fallback) {
  if (check) { console.error('Prune fallback is out of sync'); drifted = true; }
  else fs.writeFileSync(fallbackPath, fallback);
}

// SKILL.md and AGENTS.md are authored by hand (SKILL is longer than the compact
// body), so they can't be byte-generated. Assert the load-bearing rules survive
// verbatim in both — changing a rule's wording trips this, the reminder to update
// both sources.
const INVARIANTS = [
  'Readability is the constraint', 'same decision', 'change together',
  'Look before you write', 'root cause, not symptom', 'wrong place is a second bug',
  'naive heuristic', 'flimsier algorithm', 'ONE runnable check',
  'input validation at trust boundaries', 'prevents data loss', 'security',
  'accessibility', 'explicitly requested', 'independently', 'what actually ran',
];

const skill = read('skills/prune/SKILL.md');
for (const phrase of INVARIANTS) {
  for (const [label, text] of [['skills/prune/SKILL.md', skill], ['AGENTS.md', agents]]) {
    if (!text.includes(phrase)) {
      console.error(`${label} is missing rule invariant: "${phrase}"`);
      drifted = true;
    }
  }
}

if (drifted) {
  console.error(check
    ? 'Run `node scripts/sync-rule-copies.js` to regenerate the copies, or restore the missing invariant.'
    : 'Restore the missing rule invariant in SKILL.md / AGENTS.md.');
  process.exit(1);
}

console.log(check
  ? `Rule copies in sync with AGENTS.md; ${INVARIANTS.length} invariants present.`
  : `Rule copies regenerated from AGENTS.md; ${INVARIANTS.length} invariants present.`);
