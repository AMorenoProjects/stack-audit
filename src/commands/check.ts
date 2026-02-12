import ora from "ora";
import { loadConfig } from "../core/configLoader.js";
import { runAudit } from "../core/runner.js";
import { formatReport, logError } from "../utils/logger.js";
import type { CLIOptions } from "../types.js";

/**
 * The "check" command — main entry point for environment auditing.
 *
 * Flow:
 * 1. Load and validate config
 * 2. Run all checkers in parallel
 * 3. Render report (text, verbose, or JSON)
 * 4. Exit with appropriate code (using process.exitCode for clean flush)
 */
export async function checkCommand(options: CLIOptions): Promise<void> {
  const silent = options.ci || options.json;
  const spinner = silent ? null : ora("Loading configuration...").start();

  let config;
  try {
    config = await loadConfig(options.config);
    spinner?.succeed(`Loaded config for "${config.projectName}"`);
  } catch (error) {
    spinner?.fail("Configuration error");
    logError(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
    return;
  }

  spinner?.start("Running checks...");
  const report = await runAudit(config, { trustCommands: options.trustCommands });
  spinner?.stop();

  console.log(formatReport(report, { verbose: options.verbose, json: options.json }));

  if (report.summary.failed > 0) {
    process.exitCode = 1;
  }
}
