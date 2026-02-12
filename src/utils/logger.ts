import chalk from "chalk";
import boxen from "boxen";
import type { AuditReport, CheckResult, CLIOptions } from "../types.js";

const STATUS_ICONS: Record<string, string> = {
  pass: chalk.green("✔"),
  fail: chalk.red("✖"),
  warn: chalk.yellow("⚠"),
  skip: chalk.gray("○"),
};

export function formatCheckResult(result: CheckResult, verbose: boolean): string {
  const icon = STATUS_ICONS[result.status];
  const duration = chalk.gray(`(${result.duration}ms)`);
  const name = result.status === "fail" ? chalk.red(result.name) : result.name;

  // In non-verbose mode, hide passing checks' messages for a cleaner output
  if (!verbose && result.status === "pass") {
    return `  ${icon} ${name} ${duration}`;
  }

  return `  ${icon} ${name} ${duration}\n    ${chalk.gray(result.message)}`;
}

export function formatReport(report: AuditReport, options: Pick<CLIOptions, "verbose" | "json">): string {
  if (options.json) {
    return JSON.stringify({
      projectName: report.projectName,
      timestamp: report.timestamp.toISOString(),
      results: report.results,
      summary: report.summary,
    }, null, 2);
  }

  const lines: string[] = [];

  lines.push("");
  for (const result of report.results) {
    lines.push(formatCheckResult(result, options.verbose));
  }
  lines.push("");

  const { passed, failed, warned, skipped, total } = report.summary;

  const summaryParts = [
    chalk.green(`${passed} passed`),
    failed > 0 ? chalk.red(`${failed} failed`) : null,
    warned > 0 ? chalk.yellow(`${warned} warnings`) : null,
    skipped > 0 ? chalk.gray(`${skipped} skipped`) : null,
  ]
    .filter(Boolean)
    .join(chalk.gray(" · "));

  const summaryLine = `${summaryParts} ${chalk.gray(`(${total} checks)`)}`;

  const elapsed = report.results.reduce((sum, r) => sum + r.duration, 0);

  const header =
    failed > 0
      ? chalk.red.bold("stackAudit — FAIL")
      : chalk.green.bold("stackAudit — PASS");

  const boxContent = [
    header,
    chalk.gray(`Project: ${report.projectName}`),
    "",
    summaryLine,
    chalk.gray(`Done in ${elapsed}ms`),
  ].join("\n");

  lines.push(
    boxen(boxContent, {
      padding: 1,
      margin: { top: 0, bottom: 0, left: 1, right: 1 },
      borderColor: failed > 0 ? "red" : "green",
      borderStyle: "round",
    }),
  );

  return lines.join("\n");
}

export function logError(message: string): void {
  console.error(chalk.red.bold("Error:"), message);
}

export function logInfo(message: string): void {
  console.log(chalk.blue("ℹ"), message);
}

export function logSuccess(message: string): void {
  console.log(chalk.green("✔"), message);
}

export function logWarn(message: string): void {
  console.log(chalk.yellow("⚠"), message);
}
