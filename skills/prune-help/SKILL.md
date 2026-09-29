---
name: prune-help
description: >
  Quick-reference card for all prune modes, skills, and commands.
  One-shot display, not a persistent mode. Trigger: /prune-help,
  "prune help", "what prune commands", "how do I use prune".
---

# Prune Help

Display this reference card when invoked. One-shot, do NOT change mode,
write flag files, or persist anything.

## Levels

| Level | Trigger | What change |
|-------|---------|-------------|
| **Lite** | `/prune lite` | Build what's asked, name the lazier alternative in one line. |
| **Full** | `/prune full` | The ladder enforced: YAGNI → reuse → stdlib → native → installed dependency → collapse → minimum. Default. |
| **Ultra** | `/prune ultra` | YAGNI extremist. Deletion before addition. Challenges requirements before building. |

Level sticks until changed or session end. Bare `/prune` reports the
active level without changing it.

## Skills

| Skill | Trigger | What it does |
|-------|---------|--------------|
| **prune** | `/prune` | Lazy mode itself. Simplest solution that works. |
| **prune-review** | `/prune-review [PR#] [--comment]` | Senior review of a diff or PR: prod-killers first, then cuts. `L40: security: raw input in a header. Strip \r\n.` / `L42: yagni: factory, one product. Inline.` |
| **prune-audit** | `/prune-audit` | Whole-repo deletion scan: what to delete, simplify, de-duplicate, ranked by payoff. One-shot, applies nothing. |
| **prune-debt** | `/prune-debt` | Marked compromises, ceilings, and revisit triggers. Read-only; preserves mode. |
| **prune-help** | `/prune-help` | This card. |

Codex uses `@prune`, `@prune-review`, `@prune-audit`, and
`@prune-help` and `@prune-debt`; Claude Code and OpenCode use the slash-command forms above
(OpenCode ships `/prune`, `/prune-review`, `/prune-audit`, and `/prune-debt`).

## Deactivate

Say "stop prune" or "normal mode" (on its own — mid-sentence mentions
don't count). Resume anytime with `/prune <level>`. `/prune off` also
works.

## Configure Default Mode

Default mode = `full`, auto-active every session. Change it:

**Command** (easiest): `/prune default lite|full|ultra|off` — persists to
the config file below.

**Environment variable** (highest priority):
```bash
export PRUNE_DEFAULT_MODE=ultra
```

**Config file** (`~/.config/prune/config.json`, Windows: `%APPDATA%\prune\config.json`):
```json
{ "defaultMode": "lite" }
```

Set `"off"` to disable auto-activation on session start, activate manually
with `/prune full` when wanted.

Resolution: env var > config file > `full`.

## Update

Enable auto-update once: open `/plugin`, go to Marketplaces, pick prune, Enable auto-update. Claude Code then pulls new versions at startup (run `/reload-plugins` when it prompts). Manual refresh: `/plugin marketplace update prune` then `/reload-plugins`.

If `/plugin` is not recognized, your Claude Code is out of date. Update it (`npm install -g @anthropic-ai/claude-code@latest`, or `brew upgrade claude-code`) and restart. Other hosts use their own update flow.

## More

Full docs + examples: https://github.com/swicken/prune
