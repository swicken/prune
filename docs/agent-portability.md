# Agent Portability

Prune is an agent-portable skill distribution. The skills in `skills/` hold
the core behavior; host-specific files are adapters that make that behavior easy
to load in a given agent.

## Supported Adapters

| Host | Files | Notes |
|------|-------|-------|
| Claude Code | `.claude-plugin/`, `commands/`, `hooks/` | Full plugin install with session activation, mode tracking, commands, and statusline support. |
| Codex | `.codex-plugin/plugin.json`, `hooks/hooks.json`, `hooks/`, `skills/` | Plugin install with the same skills plus lifecycle hooks for activation and mode tracking. |
| OpenCode | `.opencode/plugins/prune.mjs`, `.opencode/command/`, `hooks/`, `skills/` | Server plugin injects the ruleset each turn via `experimental.chat.system.transform` and persists `/prune` switches; reuses the shared instruction builder. |
| Gemini CLI | `gemini-extension.json`, `AGENTS.md`, `commands/`, `skills/` | Extension manifest points `contextFileName` at `AGENTS.md` for always-on rules, and reuses the existing `commands/*.toml` (`/prune`, `/prune-review`, `/prune-audit`, `/prune-debt`) and `skills/`, which Gemini CLI auto-discovers. |
| Cursor | `.cursor/rules/prune.mdc` | Always-on project rule. |
| Windsurf | `.windsurf/rules/prune.md` | Project rule. |
| Cline | `.clinerules/prune.md` | Project rule. |
| GitHub Copilot | `.github/copilot-instructions.md` | Repository instruction file. |
| GitHub Copilot CLI | `AGENTS.md`, `.github/copilot-instructions.md`, `~/.copilot/copilot-instructions.md` | Reads custom instructions: per-project from `AGENTS.md` or `.github/copilot-instructions.md`, or globally from `~/.copilot/copilot-instructions.md`. Instruction-tier (no `/prune` levels or hooks). |
| Kiro | `.kiro/steering/prune.md` | Steering rule; copy globally or into a project. |
| Generic agents | `AGENTS.md` or `skills/*/SKILL.md` | Copy the compact rule file or load the skill files directly. |

## Adapter Rule

Keep adapters thin. When a host supports skills or hooks, point it at the
existing `skills/` and `hooks/` files. When a host only supports project
instructions, keep its copied rule text aligned with `AGENTS.md`.

## Portable Behavior

- `skills/prune/SKILL.md`: lazy senior dev mode
- `skills/prune-review/SKILL.md`: over-engineering review
- `skills/prune-audit/SKILL.md`: whole-repo over-engineering audit
- `skills/prune-debt/SKILL.md`: read-only compromise/ceiling/trigger inspection
- `skills/prune-help/SKILL.md`: quick reference
- `AGENTS.md`: compact always-on instruction set for agents without skill support

## Testing

Prune is on `main`; the Ponytail baseline remains in Git history at `9223a3f`. Load adapters from the Prune checkout. Runtime manifests have been renamed, with separate Prune config/state paths. Existing project instruction adapters are always-on and do not offer session modes.

Automated tests exercise the shared hook contracts, Pi behavior, manifest references, OpenCode injection, and Gemini packaging. They do not constitute an end-to-end test of each installed host. Claude-specific behavior is tested by invoking the hook processes; live coding evaluation uses Codex CLI. No new host adapters were added.

`AGENTS.md` generates both the copied project rules and `hooks/prune-fallback.js`. Run `node scripts/sync-rule-copies.js` after changing the canonical compact rules. The richer core skill is checked for behavioral invariants by that script rather than mechanically replaced.
