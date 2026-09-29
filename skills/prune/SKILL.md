---
name: prune
description: >
  Choose readable, scoped, complete implementations using reuse, stdlib, and
  native features; verify behavior without speculative abstractions. Use when
  writing, fixing, reviewing, or refactoring code, choosing dependencies, or
  explicitly asked for Prune or a simpler solution. Not for non-coding tasks.
license: MIT
---

# Prune

Keep what earns its place. Be efficient, not careless: readable code, narrow
scope, complete behavior. Less code is a consequence, not the goal.

## The ladder

Understand the request and trace the code it touches before choosing a solution.
For non-trivial work, identify the required behavior, material assumptions, and
the smallest check that demonstrates it. Inspect the repo before asking; ask
only when an unresolved choice materially changes the behavior or contract.

Stop at the first rung that holds:

1. **Does this need to exist?** Skip speculative work, never an explicit requirement.
2. **Already in this codebase?** Reuse the helper or pattern. Look before you write.
3. **Stdlib does it?** Use it.
4. **Native platform covers it?** Use it.
5. **Installed dependency covers it?** Use it. No avoidable new dependency.
6. **Can it collapse?** Only as far as it still reads at a glance.
7. **Then:** write the minimum complete implementation.

Verify unfamiliar imports, signatures, and native features against the project's
installed versions and supported environments. Resolve uncertainty using local
types, exports, existing usage, or authoritative docs; don't ship a guessed call
with a comment asking someone else to verify it.

## Rules

- Readability is the constraint, not line count. Fewer moving parts and less to hold in your head; a clear ten lines beats a cryptic one.
- No unrequested abstractions, future-proofing, or boilerplate. Deletion over addition. Boring over clever.
- One abstraction earns its place against the third real copy of the same decision. Copies must change together: similar syntax alone is not duplication. Keep independently evolving policies separate.
- Stay in scope. No drive-by refactors, renames, or reformatting. Remove private imports, variables, and helpers YOUR change makes unused; mention unrelated dead code without deleting it. Confirm external callers before removing public API.
- Simplification preserves outputs, errors, side effects, public contracts, and meaningful strings unless changing them is requested. Reduce complexity, don't merely relocate it. Split by responsibility, never by a line-count threshold.
- Bug fix = root cause, not symptom. Reproduce or gather evidence, trace the shared path and sibling callers, then test a specific hypothesis with the smallest experiment. A small diff in the wrong place is a second bug. Failed attempts return to investigation, not stacked patches.
- Between same-size stdlib options, choose the edge-case-correct one, not the flimsier algorithm.
- Mark an actual deliberate compromise with a `prune:` comment naming its ceiling and revisit trigger: `# prune: global lock, per-account locks if throughput matters`. A naive heuristic or O(n²) scan may need one; ordinary use of a built-in does not. Never invent debt to explain simple code.

## Verify and finish

Never simplify away input validation at trust boundaries, error handling that
prevents data loss, security, accessibility, or anything explicitly requested.
A supplied plan or spec counts: its units and test scenarios are the ask. The
ladder trims the how, not the whether. These guarantees hold at EVERY intensity.
Types alone don't validate external input at runtime.

Non-trivial logic leaves ONE runnable check behind: the smallest meaningful
check that fails if the behavior breaks. Use an existing test harness or an
assert-based check, not a new framework. Expected results come independently
from the spec or a worked example, never a copy of the implementation. Test
observable behavior at the smallest useful boundary; don't introduce layers
just to mock your own code. Cover meaningful trust-boundary and data-loss cases.
For a regression, demonstrate failure before the fix and success afterward
where practical; if reproduction is unavailable, state what remains unverified.
Trivial one-liners need no new test.

Run relevant checks on the final state and read their results. Reuse evidence
until a relevant edit invalidates it. A passing test doesn't prove every
requirement: compare the result with the request and inspect the final diff for
scope and newly orphaned code. Report what actually ran and what it proves;
distinguish a test, build, source review, and unverified behavior. Never claim
completion based on confidence, keyword presence, or an agent's success report.

## Output

Lead with the result. Be concise, but keep enough detail to make behavior,
evidence, and meaningful limitations clear. Requested reports and explanations
are part of the task: give them in full. Clarity wins over compression; preserve
exact numbers, units, errors, and qualifications. Prune governs what you build,
not a speaking style. No unsolicited feature tours or ritual checklists.

## Persistence

Use on coding tasks. Default: **full**. `/prune` reports the current mode;
`/prune lite|full|ultra|off` changes it. `/prune default <mode>` saves a startup
default without changing the live mode. Standalone "stop prune" or "normal mode"
disables it; mentioning either phrase inside a request does not.

## Intensity

| Level | Behavior |
|-------|----------|
| **lite** | Build the requested solution; mention a materially simpler alternative. |
| **full** | Enforce the ladder; deliver the smallest readable, complete solution. |
| **ultra** | Challenge speculative scope most strongly; all explicit requirements and safety checks still apply. |

Example: "Add a cache for these API responses."
- lite: "Added the requested cache. The existing cache helper could cover this too."
- full: "Reused the existing cache helper; no new cache class."
- ultra: "Skipped a speculative cache. Add it when profiling shows repeated work; an explicitly requested cache still gets built."
