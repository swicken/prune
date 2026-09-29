import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  DEFAULT_MODE,
  getDefaultMode,
  normalizeMode,
  isDeactivationCommand,
  normalizePersistedMode,
  writeDefaultMode,
} = require("../hooks/prune-config.js");
const { getPruneInstructions, filterSkillBodyForMode } = require("../hooks/prune-instructions.js");

export { filterSkillBodyForMode };
export const readDefaultMode = getDefaultMode;

export function resolveSessionMode(entries, fallbackMode = DEFAULT_MODE) {
  const fallback = normalizePersistedMode(fallbackMode) || DEFAULT_MODE;
  if (!Array.isArray(entries)) return fallback;

  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (entry?.type !== "custom" || entry?.customType !== "prune-mode") continue;

    const mode = normalizePersistedMode(entry?.data?.mode);
    if (mode) return mode;
  }

  return fallback;
}

export function parsePruneCommand(text, defaultMode = DEFAULT_MODE) {
  const normalizedText = String(text || "").trim().toLowerCase();

  if (!normalizedText) {
    return { type: "status" };
  }

  const [primary, secondary] = normalizedText.split(/\s+/);

  if (primary === "status") return { type: "status" };

  if (primary === "default") {
    const mode = normalizeMode(secondary);
    return mode ? { type: "set-default", mode } : { type: "invalid", reason: "invalid-default-mode" };
  }

  const mode = normalizeMode(primary);
  return mode ? { type: "set-mode", mode } : { type: "invalid", reason: "invalid-mode", mode: primary };
}

export { writeDefaultMode };

export default function pruneExtension(pi) {
  let currentMode = DEFAULT_MODE;
  let configuredDefaultMode = getDefaultMode();

  const setMode = (mode, ctx) => {
    const normalized = normalizePersistedMode(mode);
    if (!normalized) return;

    currentMode = normalized;
    pi.appendEntry("prune-mode", { mode: normalized });
    ctx?.ui?.notify?.(`Prune mode set to ${normalized}.`, "info");
  };

  const sendAlias = (skillName, args, ctx) => {
    const normalized = String(args || "").trim();
    const message = normalized ? `${skillName} ${normalized}` : skillName;

    if (ctx?.isIdle?.() === false) {
      pi.sendUserMessage(message, { deliverAs: "followUp" });
      ctx?.ui?.notify?.(`${skillName} queued as follow-up.`, "info");
      return;
    }

    pi.sendUserMessage(message);
  };

  pi.registerCommand("prune", {
    description: "Set or report Prune mode",
    handler: async (args, ctx) => {
      const parsed = parsePruneCommand(args, configuredDefaultMode);

      if (parsed.type === "status") {
        ctx?.ui?.notify?.(`Prune: current ${currentMode} • default ${configuredDefaultMode}`, "info");
        return;
      }

      if (parsed.type === "set-default") {
        let written;
        try { written = writeDefaultMode(parsed.mode); } catch (error) {
          ctx?.ui?.notify?.(`Failed to save Prune default: ${error.message}`, "error");
          return;
        }
        if (written) {
          configuredDefaultMode = getDefaultMode();
          const message = configuredDefaultMode === written
            ? `Default Prune mode set to ${written}.`
            : `Saved default ${written}, but env override keeps default at ${configuredDefaultMode}.`;
          ctx?.ui?.notify?.(message, "info");
        }
        return;
      }

      if (parsed.type === "set-mode") {
        setMode(parsed.mode, ctx);
        return;
      }

      ctx?.ui?.notify?.("Unknown or unsupported /prune mode.", "warning");
    },
  });

  pi.registerCommand("prune-review", {
    description: "Run /skill:prune-review",
    handler: (_args, ctx) => sendAlias("/skill:prune-review", "", ctx),
  });

  pi.registerCommand("prune-audit", {
    description: "Run /skill:prune-audit",
    handler: (_args, ctx) => sendAlias("/skill:prune-audit", "", ctx),
  });

  pi.registerCommand("prune-debt", {
    description: "Run /skill:prune-debt",
    handler: (_args, ctx) => sendAlias("/skill:prune-debt", "", ctx),
  });

  pi.registerCommand("prune-help", {
    description: "Run /skill:prune-help",
    handler: (_args, ctx) => sendAlias("/skill:prune-help", "", ctx),
  });

  pi.on("input", async (event) => {
    if (event?.source === "extension") return;

    const text = String(event?.text || "");
    if (currentMode !== "off" && isDeactivationCommand(text)) {
      setMode("off");
    }
  });

  pi.on("session_start", async (_event, ctx) => {
    const entries = ctx?.sessionManager?.getBranch?.() || ctx?.sessionManager?.getEntries?.() || [];
    configuredDefaultMode = getDefaultMode();
    currentMode = resolveSessionMode(entries, configuredDefaultMode);
  });

  pi.on("before_agent_start", async (event) => {
    if (!currentMode || currentMode === "off") return;
    return { systemPrompt: `${event?.systemPrompt ? event.systemPrompt + "\n\n" : ""}${getPruneInstructions(currentMode)}` };
  });
}
