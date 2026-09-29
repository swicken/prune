# Functional benchmarks

Success means required behavior survives. Code size and elapsed time are secondary observations, and no keyword-only or line-count score substitutes for correctness.

## Adapter comparison

```bash
python3 benchmarks/compare.py --before /path/to/untouched/ponytail --output /tmp/adapter-scores.json
```

`adapters.cjs` runs the same 16 contracts against Ponytail and Prune, with isolated config/state directories. The cases cover saved defaults, preservation of unrelated or invalid configuration, BOMs, mode filtering, Claude overrides/subagent JSON, Codex schema, fallback rules, Pi status/deactivation/missing events, and save failures. These deliberately target known regressions, with two positive controls. The pass fraction is not an overall reliability rate or a skill-quality score. `npm test` runs them against the candidate to prevent recurrence.

## Live coding comparison

```bash
python3 benchmarks/agentic/run.py --selftest
python3 benchmarks/agentic/run.py --live /tmp/before --skill /path/to/ponytail/skills/ponytail/SKILL.md
python3 benchmarks/agentic/run.py --live /tmp/after
python3 benchmarks/agentic/run.py --score /tmp/after
```

This uses the installed, authenticated Codex CLI; normal account usage applies. Each arm receives the same 12 seeded requests and its exact skill in a fresh workspace. The runner creates a temporary `CODEX_HOME`, copies only the login file, ignores user config, and removes the temporary home afterward. It does not expose or save credentials in the workspace. CLI-managed service defaults and bundled tooling can still affect runs. Both arms should use the same CLI/model/environment; record them with the results.

Tasks exercise reuse, shared-path fixes, real versus incidental duplication, behavior preservation, runtime compatibility, removal of newly orphaned code, runnable regression checks, spec completeness, iterator debugging, requested explanation depth, and debt classification. The model sees seeds and requests but not the grader. `cases.py` contains independent expected values. Grading runs submitted Python/JS; only run it on code you trust. Execution timeouts limit hangs, not malicious behavior.

The regression test must pass on the submitted fix and fail when the original bug is restored; bytecode caches are removed between those checks. Grader self-tests verify a good reference, missing implementations, and an under-delivering stub. Semantic report quality and shared-helper design also require source review. Passes prove these contracts only; they do not prove general safety or universal superiority. A single paired run is a pilot, not a statistical comparison. Run several independent pairs and keep model/settings fixed before making broader claims.

Artifacts include exact skill snapshots, generated files, agent-reported commands, independent scores, and timing/usage summaries. [Current report](results/2026-09-29-prune.md).

## Historical material

The existing `promptfooconfig.yaml`, providers, prompts, chart, and older result files originate from Ponytail. They measure single-shot code size and API usage, lack the functional gates above, and are retained for provenance. They are not the validation path for Prune and their numbers must not be relabelled as Prune results.
