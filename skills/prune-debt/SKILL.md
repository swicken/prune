---
name: prune-debt
description: >
  Report deliberate compromises marked by prune: comments, including their
  ceiling and revisit trigger. Use for Prune debt, deferred shortcuts, or a
  debt ledger. Read-only and one-shot; does not change the active mode.
license: MIT
---

Use `rg -n 'prune:'` on the repository, respecting ignore rules and excluding
vendored/generated files, build output, and quoted examples in docs or fixtures.
Inspect each candidate in context: search hits are not automatically debt.
Recognize the comment syntax of the file, including HTML and block comments;
don't mistake a string containing the marker for a comment. Ordinary use of a
built-in or explanatory intent is not a deferred compromise.

For each real compromise report `file:line — shortcut; ceiling; revisit trigger`.
Extract the limits and triggers actually stated; use `not stated` if missing,
never invent an owner, threshold, deadline, or upgrade. Tag a missing trigger
`no-trigger`. Include a compromise with incomplete information rather than
silently excluding it. Report marker candidates examined, real compromises,
and missing triggers separately. No debt found means no marked debt found,
not proof the repository has no technical debt.

Keep the current Prune mode. Print the report unless the user explicitly asks
to save it, in which case write to the requested location. Don't implement the
upgrades or schedule work. A ledger is an observation, not new scope.
