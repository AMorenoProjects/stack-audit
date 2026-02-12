import type {
  AuditReport,
  CheckerFn,
  CheckResult,
  StackAuditConfig,
} from "../types.js";
import { buildCheckerPipeline, type PipelineOptions } from "../checks/index.js";

/**
 * Executes all configured checkers in parallel and aggregates results.
 *
 * Uses Promise.allSettled to ensure every checker runs to completion
 * regardless of individual failures — the "Fail Efficiently" principle.
 */
export async function runAudit(
  config: StackAuditConfig,
  options: PipelineOptions = { trustCommands: false },
): Promise<AuditReport> {
  const checkers: CheckerFn[] = buildCheckerPipeline(config.checks, options);

  const settled = await Promise.allSettled(
    checkers.map((checker) => checker()),
  );

  const results: CheckResult[] = [];

  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      results.push(...outcome.value);
    } else {
      results.push({
        name: "Unknown Check",
        status: "fail",
        message:
          outcome.reason instanceof Error
            ? outcome.reason.message
            : String(outcome.reason),
        duration: 0,
      });
    }
  }

  // Single-pass summary instead of 4x .filter() iterations
  const summary = { passed: 0, failed: 0, warned: 0, skipped: 0, total: results.length };
  for (const r of results) {
    switch (r.status) {
      case "pass": summary.passed++; break;
      case "fail": summary.failed++; break;
      case "warn": summary.warned++; break;
      case "skip": summary.skipped++; break;
    }
  }

  return {
    projectName: config.projectName,
    timestamp: new Date(),
    results,
    summary,
  };
}
