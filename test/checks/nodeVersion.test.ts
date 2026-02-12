import { describe, it, expect } from "vitest";
import { checkNodeVersion } from "../../src/checks/nodeVersion.js";

describe("checkNodeVersion", () => {
  it("passes when current Node satisfies the range", async () => {
    // Current Node is definitely >= 18 (required by the project)
    const checker = checkNodeVersion(">=18.0.0");
    const results = await checker();
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("pass");
    expect(results[0].name).toBe("Node.js Version");
  });

  it("fails when range is impossibly high", async () => {
    const checker = checkNodeVersion(">=999.0.0");
    const results = await checker();
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("fail");
  });

  it("fails on invalid semver range", async () => {
    const checker = checkNodeVersion("not-a-range!!!");
    const results = await checker();
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("fail");
    expect(results[0].message).toContain("Invalid semver range");
  });

  it("records duration", async () => {
    const checker = checkNodeVersion(">=18.0.0");
    const results = await checker();
    expect(results[0].duration).toBeGreaterThanOrEqual(0);
  });
});
