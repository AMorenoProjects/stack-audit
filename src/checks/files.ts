import * as fs from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
import { timedCheck } from "../utils/system.js";
import type { CheckResult } from "../types.js";

/**
 * Checks that all required files exist in the project directory.
 *
 * Security: Rejects paths that resolve outside the CWD to prevent
 * a malicious config from probing the filesystem (e.g. "../../etc/passwd").
 */
export function checkFiles(filesList: string[]): () => Promise<CheckResult[]> {
  return async () => {
    const results: CheckResult[] = [];
    const cwd = process.cwd();

    for (const file of filesList) {
      const result = await timedCheck(`File: ${file}`, async () => {
        // Reject absolute paths outright
        if (isAbsolute(file)) {
          return {
            status: "fail" as const,
            message: `Absolute paths are not allowed in file checks: "${file}"`,
          };
        }

        const filePath = resolve(cwd, file);
        const realPath = await fs.realpath(filePath);
        const rel = relative(cwd, realPath);
        if (rel.startsWith("..")) {
          return {
            status: "fail" as const,
            message: `Path traversal detected: "${file}" resolves outside the project directory`,
          };
        }

        try {
          await fs.access(realPath);
        } catch {
          return {
            status: "fail" as const,
            message: `Required file not found: ${file}`,
          };
        }

        return {
          status: "pass" as const,
          message: `${file} exists`,
        };
      });

      results.push(result);
    }

    return results;
  };
}
