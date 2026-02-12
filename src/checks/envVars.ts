import { readFile } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
import { parse as dotenvParse } from "dotenv";
import { timedCheck } from "../utils/system.js";
import type { CheckResult, EnvConfig } from "../types.js";

/**
 * Validates environment variables following the "Closed Eyes" principle:
 * - Checks if required keys EXIST in the target .env file
 * - Checks if values are NON-EMPTY
 * - NEVER logs or exposes the actual secret values
 *
 * Security: Rejects env.target paths that resolve outside CWD.
 * Uses dotenv.parse() instead of dotenv.config() to avoid
 * injecting values into process.env as a side-effect.
 */
export function checkEnvVars(envConfig: EnvConfig): () => Promise<CheckResult[]> {
  return async () => {
    const results: CheckResult[] = [];
    const cwd = process.cwd();

    // Path traversal guard
    if (isAbsolute(envConfig.target)) {
      results.push({
        name: `Env File (${envConfig.target})`,
        status: "fail",
        message: `Absolute paths are not allowed for env.target: "${envConfig.target}"`,
        duration: 0,
      });
      return results;
    }

    const targetPath = resolve(cwd, envConfig.target);
    const rel = relative(cwd, targetPath);
    if (rel.startsWith("..")) {
      results.push({
        name: `Env File (${envConfig.target})`,
        status: "fail",
        message: `Path traversal detected: "${envConfig.target}" resolves outside the project directory`,
        duration: 0,
      });
      return results;
    }

    let envKeys: Record<string, string> = {};

    const fileCheck = await timedCheck(`Env File (${envConfig.target})`, async () => {
      let content: string;
      try {
        content = await readFile(targetPath, "utf-8");
      } catch {
        // CI/CD Support: It's okay if .env is missing, as long as variables are in process.env
        return {
          status: "pass",
          message: `File not found: ${envConfig.target} (Using process.env)`,
        };
      }

      envKeys = dotenvParse(content);

      return {
        status: "pass" as const,
        message: `${envConfig.target} loaded successfully`,
      };
    });

    results.push(fileCheck);

    // Proceed to check keys regardless of file existence


    for (const key of envConfig.required) {
      const keyResult = await timedCheck(`Env: ${key}`, async () => {
        const value = envKeys[key] ?? process.env[key];

        if (value === undefined) {
          return {
            status: "fail" as const,
            message: `Missing required variable "${key}" in ${envConfig.target} and process.env`,
          };
        }

        if (value.trim() === "") {
          return {
            status: "fail" as const,
            message: `Variable "${key}" exists but is empty`,
          };
        }

        return {
          status: "pass" as const,
          message: `"${key}" is set (value hidden)`,
        };
      });

      results.push(keyResult);
    }

    return results;
  };
}
