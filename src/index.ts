#!/usr/bin/env node

import { Command } from "commander";
import { checkCommand } from "./commands/check.js";
import { initCommand } from "./commands/init.js";

const program = new Command();

program
  .name("stackaudit")
  .description(
    "Audit your development environment against a declarative configuration file.",
  )
  .version("0.1.0");

program
  .command("check")
  .description("Run all environment checks defined in stackAudit.config.json")
  .option("-c, --config <path>", "Path to config file", "stackAudit.config.json")
  .option("-v, --verbose", "Show detailed output for all checks", false)
  .option("--ci", "CI mode — no spinners, plain output", false)
  .option("--json", "Output results as JSON (implies --ci)", false)
  .option(
    "--trust-commands",
    "Allow execution of custom commands not on the safe allowlist",
    false,
  )
  .action(async (opts) => {
    await checkCommand({
      config: opts.config,
      verbose: opts.verbose,
      ci: opts.ci || opts.json,
      json: opts.json,
      trustCommands: opts.trustCommands,
    });
  });

program
  .command("init")
  .description("Generate a starter stackAudit.config.json in the current directory")
  .option("-d, --detect", "Auto-detect installed tools and populate config", false)
  .action(async (opts) => {
    await initCommand({ detect: opts.detect });
  });

program.parse();
