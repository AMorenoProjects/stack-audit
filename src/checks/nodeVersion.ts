import semver from "semver";
import { timedCheck } from "../utils/system.js";
import type { CheckResult } from "../types.js";

/**
 * Validates that the current Node.js version satisfies
 * the semver range specified in the config.
 *
 * Uses process.version directly — no subprocess needed.
 */
export function checkNodeVersion(requiredRange: string): () => Promise<CheckResult[]> {
  return async () => {
    const result = await timedCheck("Node.js Version", async () => {
      const current = process.version;
      const cleanCurrent = semver.clean(current);

      if (!cleanCurrent) {
        return {
          status: "fail" as const,
          message: `Could not parse current Node.js version: ${current}`,
        };
      }

      if (!semver.validRange(requiredRange)) {
        return {
          status: "fail" as const,
          message: `Invalid semver range in config: "${requiredRange}"`,
        };
      }

      if (semver.satisfies(cleanCurrent, requiredRange)) {
        return {
          status: "pass" as const,
          message: `v${cleanCurrent} satisfies ${requiredRange}`,
        };
      }

      return {
        status: "fail" as const,
        message: `v${cleanCurrent} does not satisfy ${requiredRange}`,
      };
    });

    return [result];
  };
}
