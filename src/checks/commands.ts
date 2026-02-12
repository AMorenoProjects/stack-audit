import { execCommand, isCommandAllowed, timedCheck } from "../utils/system.js";
import type { CheckResult, CommandConfig } from "../types.js";

/**
 * Executes custom shell commands and optionally matches output
 * against an expected string.
 *
 * Security: Commands not on the safe allowlist are SKIPPED unless
 * the user explicitly passes --trust-commands. This prevents a
 * malicious config file from executing arbitrary code on a
 * developer's machine during onboarding (clone + npx stackaudit check).
 */
export function checkCommands(
  commandsConfig: CommandConfig[],
  trustCommands: boolean = false,
): () => Promise<CheckResult[]> {
  return async () => {
    const results: CheckResult[] = [];

    for (const cmdDef of commandsConfig) {
      const label = cmdDef.cmd.length > 40
        ? cmdDef.cmd.slice(0, 37) + "..."
        : cmdDef.cmd;

      // Gate: refuse to execute untrusted commands without explicit consent
      if (!trustCommands && !isCommandAllowed(cmdDef.cmd)) {
        results.push({
          name: `Command: ${label}`,
          status: "skip",
          message:
            `Skipped untrusted command: "${cmdDef.cmd}". ` +
            `Use --trust-commands to allow execution of custom commands.`,
          duration: 0,
        });
        continue;
      }

      const result = await timedCheck(`Command: ${label}`, async () => {
        let stdout: string;
        try {
          stdout = await execCommand(cmdDef.cmd);
        } catch (error) {
          const msg =
            cmdDef.errorMsg ??
            `Command failed: "${cmdDef.cmd}" — ${error instanceof Error ? error.message : String(error)}`;
          return { status: "fail" as const, message: msg };
        }

        if (cmdDef.match && !stdout.includes(cmdDef.match)) {
          const msg =
            cmdDef.errorMsg ??
            `Output of "${cmdDef.cmd}" does not contain "${cmdDef.match}"`;
          return { status: "fail" as const, message: msg };
        }

        return {
          status: "pass" as const,
          message: cmdDef.match
            ? `"${cmdDef.cmd}" output contains "${cmdDef.match}"`
            : `"${cmdDef.cmd}" executed successfully`,
        };
      });

      results.push(result);
    }

    return results;
  };
}
