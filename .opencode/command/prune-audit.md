---
description: Audit the whole repo: what to delete, simplify, de-duplicate
---

Audit the entire repository for deletion and duplication, not correctness. Scan the whole tree, not a diff. Rank by maintenance payoff, not raw line count; lead with the handful that matter, cap at ~15 and summarize the rest rather than dumping every finding. One line each: <tag> <what to cut>. <replacement>. [path]. Tags: delete, stdlib, native, yagni, shrink, plus dry (same decision in 3+ places that must change together — list the copies, name one home). Don't flag generated code, vendored dirs, migrations, or test fixtures; for public API surface flag 'delete: if unused — confirm callers first', never a clean cut. Prod-killers (security, data-loss, correctness) go to /prune-review or a security pass. End with demonstrated net lines (or unknown) and deps removable. If nothing to cut: 'Lean already. Ship.'
