import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { loadConfig } from "../../src/core/configLoader.js";

const TEST_DIR = join(import.meta.dirname, "../.tmp-test");
const CONFIG_PATH = join(TEST_DIR, "stackAudit.config.json");

const VALID_CONFIG = {
  projectName: "test-project",
  version: "1.0.0",
  checks: {
    node: ">=18.0.0",
  },
};

describe("configLoader", () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it("loads and validates a correct config file", async () => {
    await writeFile(CONFIG_PATH, JSON.stringify(VALID_CONFIG));
    const config = await loadConfig(CONFIG_PATH);
    expect(config.projectName).toBe("test-project");
    expect(config.checks.node).toBe(">=18.0.0");
  });

  it("throws on missing file", async () => {
    await expect(loadConfig(join(TEST_DIR, "nope.json"))).rejects.toThrow(
      "Config file not found",
    );
  });

  it("throws on invalid JSON", async () => {
    await writeFile(CONFIG_PATH, "{ broken json }}}");
    await expect(loadConfig(CONFIG_PATH)).rejects.toThrow("Invalid JSON");
  });

  it("throws on schema validation failure", async () => {
    await writeFile(CONFIG_PATH, JSON.stringify({ bad: true }));
    await expect(loadConfig(CONFIG_PATH)).rejects.toThrow(
      "Invalid configuration",
    );
  });

  it("rejects config with empty checks object", async () => {
    const config = { ...VALID_CONFIG, checks: {} };
    await writeFile(CONFIG_PATH, JSON.stringify(config));
    await expect(loadConfig(CONFIG_PATH)).rejects.toThrow(
      "At least one check",
    );
  });
});
