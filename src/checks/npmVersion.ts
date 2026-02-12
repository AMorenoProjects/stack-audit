import semver from "semver";
import { execCommand, timedCheck } from "../utils/system.js";
import type { CheckResult } from "../types.js";

/**
 * Validates that the installed npm version satisfies
 * the semver range from config. Requires shelling out
 * since npm version is not available on process.
 */
export function checkNpmVersion(requiredRange: string): () => Promise<CheckResult[]> {
  return async () => {
    const result = await timedCheck("npm Version", async () => {
      const stdout = await execCommand("npm --version");
      const current = semver.clean(stdout.trim());

      if (!current) {
        return {
          status: "fail" as const,
          message: `Could not parse npm version from output: "${stdout.trim()}"`,
        };
      }

      if (!semver.validRange(requiredRange)) {
        return {
          status: "fail" as const,
          message: `Invalid semver range in config: "${requiredRange}"`,
        };
      }

      if (semver.satisfies(current, requiredRange)) {
        return {
          status: "pass" as const,
          message: `v${current} satisfies ${requiredRange}`,
        };
      }

      return {
        status: "fail" as const,
        message: `v${current} does not satisfy ${requiredRange}`,
      };
    });

    return [result];
  };
}
