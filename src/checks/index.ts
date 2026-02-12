import type { CheckerFn, ChecksConfig } from "../types.js";
import { checkNodeVersion } from "./nodeVersion.js";
import { checkNpmVersion } from "./npmVersion.js";
import { checkEnvVars } from "./envVars.js";
import { checkPorts } from "./ports.js";
import { checkFiles } from "./files.js";
import { checkCommands } from "./commands.js";

export interface PipelineOptions {
  trustCommands: boolean;
}

/**
 * Builds the checker pipeline based on the config.
 * Only registers checkers for keys that are present in the config,
 * so users only run what they declare.
 */
export function buildCheckerPipeline(
  checks: ChecksConfig,
  options: PipelineOptions = { trustCommands: false },
): CheckerFn[] {
  const pipeline: CheckerFn[] = [];

  if (checks.node) {
    pipeline.push(checkNodeVersion(checks.node));
  }

  if (checks.npm) {
    pipeline.push(checkNpmVersion(checks.npm));
  }

  if (checks.files && checks.files.length > 0) {
    pipeline.push(checkFiles(checks.files));
  }

  if (checks.env) {
    pipeline.push(checkEnvVars(checks.env));
  }

  if (checks.ports && checks.ports.length > 0) {
    pipeline.push(checkPorts(checks.ports));
  }

  if (checks.commands && checks.commands.length > 0) {
    pipeline.push(checkCommands(checks.commands, options.trustCommands));
  }

  return pipeline;
}
