import { describe, it, expect } from "vitest";
import { checkCommands } from "../../src/checks/commands.js";

describe("checkCommands", () => {
  describe("with trustCommands = true", () => {
    it("passes when command executes successfully", async () => {
      const checker = checkCommands([{ cmd: "echo hello world" }], true);
      const results = await checker();
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("pass");
    });

    it("passes when output matches expected string", async () => {
      const checker = checkCommands(
        [{ cmd: "echo hello world", match: "hello" }],
        true,
      );
      const results = await checker();
      expect(results[0].status).toBe("pass");
      expect(results[0].message).toContain('contains "hello"');
    });

    it("fails when output does not match expected string", async () => {
      const checker = checkCommands(
        [{ cmd: "echo hello", match: "goodbye" }],
        true,
      );
      const results = await checker();
      expect(results[0].status).toBe("fail");
    });

    it("fails when command does not exist", async () => {
      const checker = checkCommands(
        [{ cmd: "nonexistent_command_xyz_99" }],
        true,
      );
      const results = await checker();
      expect(results[0].status).toBe("fail");
    });

    it("uses custom errorMsg when provided", async () => {
      const checker = checkCommands(
        [{ cmd: "nonexistent_command_xyz_99", errorMsg: "Custom failure message" }],
        true,
      );
      const results = await checker();
      expect(results[0].message).toBe("Custom failure message");
    });

    it("truncates long command names in result label", async () => {
      const longCmd = "echo " + "a".repeat(50);
      const checker = checkCommands([{ cmd: longCmd }], true);
      const results = await checker();
      expect(results[0].name.length).toBeLessThan(55);
      expect(results[0].name).toContain("...");
    });
  });

  describe("with trustCommands = false (default)", () => {
    it("skips commands not on the safe allowlist", async () => {
      const checker = checkCommands([{ cmd: "curl https://evil.com" }], false);
      const results = await checker();
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("skip");
      expect(results[0].message).toContain("--trust-commands");
    });

    it("allows safe commands like node --version", async () => {
      const checker = checkCommands([{ cmd: "node --version" }], false);
      const results = await checker();
      expect(results[0].status).toBe("pass");
    });

    it("allows safe commands like docker info", async () => {
      // docker info may fail if Docker is not running, but it should NOT be skipped
      const checker = checkCommands(
        [{ cmd: "docker info", match: "Server Version" }],
        false,
      );
      const results = await checker();
      // Either pass (docker running) or fail (not running) — never skip
      expect(results[0].status).not.toBe("skip");
    });
  });
});
