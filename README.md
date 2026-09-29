# Prune

Keep what earns its place. A coding skill for readable, scoped, complete, verified work.

Prune starts with Scott Wicken’s Ponytail fork and incorporates selected upstream fixes. It keeps the simplicity ladder: question speculative work, reuse what exists, then reach for the standard library, native features, and installed dependencies before writing code. Readability and required behavior constrain every shortcut.

This repository is private during testing. `main` preserves the untouched Ponytail baseline at `9223a3f`; `codex/prune` contains the implementation for review. No changes were made in the original Ponytail checkout.

## What changed

- Identify required behavior and a meaningful check before non-trivial work. Investigate root causes and sibling callers; preserve outputs, errors, side effects, and public contracts when simplifying.
- Share repeated decisions that must change together; keep independently evolving policies separate. Remove private code made unused by the current change.
- Verify unfamiliar APIs against supported runtimes. Leave one small runnable check for non-trivial logic and report only verification actually performed.
- Preserve unrelated configuration fields and reject malformed or non-object configuration writes. Accept BOM-prefixed JSON; reject `review` as a startup default. Failed saves are reported without silently replacing the original file.
- Respect `CLAUDE_CONFIG_DIR` for flags, settings, and both statuslines. Emit structured Claude subagent context, avoid unsafe statusline suggestions, and handle closed output pipes.
- Pi reports bare-command status, survives missing events, reports failed default saves, and deactivates only on standalone commands. Instruction filtering keeps plain mode labels and filters quoted examples only.
- Add read-only debt inspection, generated fallback/rule parity, version consistency checks, Linux/Windows CI, and functional before/after benchmarks.

Requested explanations remain complete. No fixed three-line answer limit; line count is a secondary observation rather than a success criterion.

## Test the candidate

```bash
gh repo clone swicken/prune
cd prune
git switch codex/prune
npm run check
npm test
python3 benchmarks/agentic/run.py --selftest
```

Use the candidate checkout for testing while `main` remains the comparison baseline. Load `skills/prune/SKILL.md` directly in a host that supports skills, or use its plugin adapter. The existing Claude, Codex, Pi, OpenCode, Gemini, and instruction-file adapters are retained; see [adapter files and limitations](docs/agent-portability.md). Do not install from the repository's default branch until the candidate is merged: it deliberately contains Ponytail.

The five skills are `prune`, `prune-review`, `prune-audit`, `prune-debt`, and `prune-help`. Audit/debt/help are one-shot; review/audit/debt are read-only by default. Existing review comment publication remains explicit opt-in.

`/prune` reports status; `/prune lite|full|ultra|off` changes mode. `/prune default <mode>` saves a startup default without changing the current mode. Standalone “stop prune” or “normal mode” disables it; mentions within a request do not.

Defaults resolve from `PRUNE_DEFAULT_MODE`, then the `defaultMode` field in the Prune config, then `full`. Configuration lives at `$XDG_CONFIG_HOME/prune/config.json`, otherwise `~/.config/prune/config.json` or `%APPDATA%/prune/config.json` on Windows. Prune uses its own config and state names; it does not migrate or overwrite Ponytail settings.

## Verification

[Benchmark method](benchmarks/README.md) explains the identical adapter contracts, isolated live coding tasks, hidden functional graders, and their limits. [Before/after report](benchmarks/results/2026-09-29-prune.md) records the measured outcomes and artifacts. Inherited Ponytail line-count benchmarks are historical evidence, not Prune measurements.

`AGENTS.md` is the compact rule source. After editing it, run `node scripts/sync-rule-copies.js`; `npm run check` verifies the five rule copies, generated hook fallback, and manifest versions. No new runtime dependencies were added.

## Provenance

Derived from [Scott’s Ponytail fork](https://github.com/swicken/ponytail), itself derived from [Dietrich Gebert’s Ponytail](https://github.com/DietrichGebert/ponytail). Dietrich created the original concept, ladder, adapters, artwork, and historical benchmarks. Original MIT attribution is retained in [LICENSE](LICENSE). Prune’s changes adapt hypothesis-driven debugging, behavior-focused verification, shared-decision DRY, and conservative simplification to the existing scope/readability philosophy.
