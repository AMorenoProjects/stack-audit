import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { configSchema } from "../schemas/config.schema.js";
import type { StackAuditConfig } from "../types.js";

const DEFAULT_CONFIG_FILE = "stackAudit.config.json";

/**
 * Loads and validates the stackAudit configuration file.
 *
 * Flow:
 * 1. Resolve the config file path relative to CWD
 * 2. Read and parse as JSON
 * 3. Validate against the Zod schema
 * 4. Return the typed config or throw with actionable errors
 */
export async function loadConfig(
  configPath?: string,
): Promise<StackAuditConfig> {
  const filePath = resolve(process.cwd(), configPath ?? DEFAULT_CONFIG_FILE);

  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch {
    throw new Error(
      `Config file not found: ${filePath}\n` +
        `Run "stackaudit init" to create one, or use --config to specify a path.`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `Invalid JSON in config file: ${filePath}\n` +
        `Check for trailing commas or syntax errors.`,
    );
  }

  const result = configSchema.safeParse(parsed);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `Invalid configuration in ${filePath}:\n${issues}`,
    );
  }

  return result.data as StackAuditConfig;
}
