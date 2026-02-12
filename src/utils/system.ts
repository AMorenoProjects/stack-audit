import { execa } from "execa";
import type { CheckResult } from "../types.js";

/**
 * Allowlist of commands considered safe for automatic execution.
 * Commands not on this list require explicit user consent via --trust-commands.
 *
 * Only commands that read system state (version checks, service status)
 * belong here. Never add commands that modify state (rm, mv, curl, wget, etc).
 */
/**
 * Only EXACT read-only commands belong here.
 * NEVER add bare tool names like "node", "npm", "npx" — they allow
 * arbitrary code execution (e.g. `node -e`, `npx evil-pkg`, `npm exec`).
 */
const SAFE_COMMAND_PREFIXES = [
  "node --version",
  "node -v",
  "npm --version",
  "npm -v",
  "docker info",
  "docker --version",
  "docker compose version",
  "git --version",
  "python --version",
  "python3 --version",
  "ruby --version",
  "java --version",
  "javac --version",
  "go version",
  "rustc --version",
  "cargo --version",
];

/**
 * Checks if a command is on the safe allowlist.
 */
export function isCommandAllowed(command: string): boolean {
  const normalized = command.trim();
  return SAFE_COMMAND_PREFIXES.some((safeCmd) => normalized === safeCmd);
}

/**
 * Parses a command string into [executable, ...args] respecting
 * single and double quotes.
 *
 * "grep 'Server Version' file.log"  → ["grep", "Server Version", "file.log"]
 * "echo \"hello world\""            → ["echo", "hello world"]
 *
 * This avoids the naive split(/\s+/) which breaks quoted arguments.
 */
export function parseCommand(command: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  for (const char of command) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\" && !inSingle) {
      escaped = true;
      continue;
    }

    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }

    if (char === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }

    if (/\s/.test(char) && !inSingle && !inDouble) {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Executes a shell command and returns its stdout.
 * Throws if the command fails or is not found.
 *
 * Uses a proper token parser instead of naive split, so quoted
 * arguments like "grep 'Server Version' file" work correctly.
 *
 * Shell operators (|, >, &&, ;) are NOT interpreted because execa
 * runs without shell: true. This is a security feature.
 */
export async function execCommand(command: string): Promise<string> {
  const tokens = parseCommand(command);

  if (tokens.length === 0) {
    throw new Error("Empty command");
  }

  const [cmd, ...args] = tokens;

  const result = await execa(cmd, args, {
    timeout: 10_000,
    reject: false,
  });

  if (result.failed) {
    throw new Error(result.stderr || `Command "${command}" failed`);
  }

  return result.stdout;
}

/**
 * Measures the execution time of an async check function.
 * Wraps exceptions into a fail CheckResult so the runner never crashes.
 */
export async function timedCheck(
  name: string,
  fn: () => Promise<Omit<CheckResult, "name" | "duration">>,
): Promise<CheckResult> {
  const start = performance.now();
  try {
    const partial = await fn();
    return {
      name,
      ...partial,
      duration: Math.round(performance.now() - start),
    };
  } catch (error) {
    return {
      name,
      status: "fail",
      message: error instanceof Error ? error.message : String(error),
      duration: Math.round(performance.now() - start),
    };
  }
}
