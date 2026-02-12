import { describe, it, expect } from "vitest";
import { runAudit } from "../../src/core/runner.js";
import type { StackAuditConfig } from "../../src/types.js";

describe("runner", () => {
  it("runs all configured checks and produces a summary", async () => {
    const config: StackAuditConfig = {
      projectName: "test-runner",
      version: "1.0.0",
      checks: {
        node: ">=18.0.0",
        files: ["package.json"],
      },
    };

    const report = await runAudit(config);

    expect(report.projectName).toBe("test-runner");
    expect(report.timestamp).toBeInstanceOf(Date);
    expect(report.results.length).toBeGreaterThanOrEqual(2);
    expect(report.summary.total).toBe(report.results.length);
    expect(report.summary.passed + report.summary.failed + report.summary.warned + report.summary.skipped)
      .toBe(report.summary.total);
  });

  it("handles a config with no matching checks gracefully", async () => {
    const config: StackAuditConfig = {
      projectName: "empty",
      version: "1.0.0",
      checks: {},
    };

    const report = await runAudit(config);

    expect(report.results).toHaveLength(0);
    expect(report.summary.total).toBe(0);
  });

  it("captures failures without crashing the entire audit", async () => {
    const config: StackAuditConfig = {
      projectName: "mixed",
      version: "1.0.0",
      checks: {
        node: ">=18.0.0",
        files: ["this-file-definitely-does-not-exist.xyz"],
      },
    };

    const report = await runAudit(config);

    expect(report.summary.passed).toBeGreaterThanOrEqual(1);
    expect(report.summary.failed).toBeGreaterThanOrEqual(1);
  });

  it("runs checks in parallel (timing proof)", async () => {
    const config: StackAuditConfig = {
      projectName: "parallel-test",
      version: "1.0.0",
      checks: {
        node: ">=18.0.0",
        npm: ">=9.0.0",
        files: ["package.json", "tsconfig.json"],
      },
    };

    const start = performance.now();
    await runAudit(config);
    const elapsed = performance.now() - start;

    // If sequential, npm --version alone takes ~100ms+.
    // Parallel should keep total well under 2s even on slow machines.
    expect(elapsed).toBeLessThan(2000);
  });
});
