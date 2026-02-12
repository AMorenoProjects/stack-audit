import { describe, it, expect } from "vitest";
import { checkNpmVersion } from "../../src/checks/npmVersion.js";

describe("checkNpmVersion", () => {
  it("passes when current npm satisfies the range", async () => {
    const checker = checkNpmVersion(">=9.0.0");
    const results = await checker();
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("pass");
    expect(results[0].name).toBe("npm Version");
  });

  it("fails when range is impossibly high", async () => {
    const checker = checkNpmVersion(">=999.0.0");
    const results = await checker();
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("fail");
  });

  it("fails on invalid semver range", async () => {
    const checker = checkNpmVersion("garbage!!!");
    const results = await checker();
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("fail");
    expect(results[0].message).toContain("Invalid semver range");
  });
});
