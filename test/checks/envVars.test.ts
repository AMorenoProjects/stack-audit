import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { checkEnvVars } from "../../src/checks/envVars.js";

// Use CWD-relative paths so path traversal guard doesn't block
const TEST_DIR_NAME = ".tmp-env-test";
const TEST_DIR = join(process.cwd(), TEST_DIR_NAME);
const ENV_FILENAME = `${TEST_DIR_NAME}/.env`;
const ENV_FILE_ABS = join(TEST_DIR, ".env");

describe("checkEnvVars", () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it("passes when all required keys exist and are non-empty", async () => {
    await writeFile(ENV_FILE_ABS, "DB_URL=postgres://localhost\nAPI_KEY=secret123\n");

    const checker = checkEnvVars({
      target: ENV_FILENAME,
      example: ".env.example",
      required: ["DB_URL", "API_KEY"],
    });

    const results = await checker();
    // 1 file check + 2 key checks
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.status === "pass")).toBe(true);
  });

  it("never exposes secret values in messages", async () => {
    const secretValue = "super-secret-token-12345";
    await writeFile(ENV_FILE_ABS, `API_KEY=${secretValue}\n`);

    const checker = checkEnvVars({
      target: ENV_FILENAME,
      example: ".env.example",
      required: ["API_KEY"],
    });

    const results = await checker();
    const allMessages = results.map((r) => r.message).join(" ");

    expect(allMessages).not.toContain(secretValue);
    expect(allMessages).toContain("value hidden");
  });

  it("fails when .env file is missing", async () => {
    const checker = checkEnvVars({
      target: `${TEST_DIR_NAME}/nonexistent.env`,
      example: ".env.example",
      required: ["KEY"],
    });

    const results = await checker();
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("fail");
    expect(results[0].message).toContain("File not found");
  });

  it("fails when a required key is missing from .env", async () => {
    await writeFile(ENV_FILE_ABS, "SOME_KEY=value\n");

    const originalValue = process.env.MISSING_KEY;
    delete process.env.MISSING_KEY;

    const checker = checkEnvVars({
      target: ENV_FILENAME,
      example: ".env.example",
      required: ["MISSING_KEY"],
    });

    const results = await checker();
    process.env.MISSING_KEY = originalValue;

    const keyResult = results.find((r) => r.name === "Env: MISSING_KEY");
    expect(keyResult?.status).toBe("fail");
    expect(keyResult?.message).toContain("Missing required variable");
  });

  it("fails when a required key exists but is empty", async () => {
    await writeFile(ENV_FILE_ABS, "EMPTY_KEY=\n");

    const checker = checkEnvVars({
      target: ENV_FILENAME,
      example: ".env.example",
      required: ["EMPTY_KEY"],
    });

    const results = await checker();
    const keyResult = results.find((r) => r.name === "Env: EMPTY_KEY");
    expect(keyResult?.status).toBe("fail");
    expect(keyResult?.message).toContain("empty");
  });

  it("falls back to process.env when key is not in .env file", async () => {
    await writeFile(ENV_FILE_ABS, "OTHER=value\n");

    const envKey = "__STACKAUDIT_TEST_FALLBACK__";
    process.env[envKey] = "from-process-env";

    const checker = checkEnvVars({
      target: ENV_FILENAME,
      example: ".env.example",
      required: [envKey],
    });

    const results = await checker();
    delete process.env[envKey];

    const keyResult = results.find((r) => r.name === `Env: ${envKey}`);
    expect(keyResult?.status).toBe("pass");
  });

  it("skips key checks when file load fails", async () => {
    const checker = checkEnvVars({
      target: `${TEST_DIR_NAME}/nope.env`,
      example: ".env.example",
      required: ["KEY_A", "KEY_B", "KEY_C"],
    });

    const results = await checker();
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("fail");
  });

  it("rejects path traversal in env.target", async () => {
    const checker = checkEnvVars({
      target: "../../etc/shadow",
      example: ".env.example",
      required: ["root"],
    });

    const results = await checker();
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("fail");
    expect(results[0].message).toContain("Path traversal");
  });

  it("rejects absolute paths in env.target", async () => {
    const checker = checkEnvVars({
      target: "/etc/shadow",
      example: ".env.example",
      required: ["root"],
    });

    const results = await checker();
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("fail");
    expect(results[0].message).toContain("Absolute paths");
  });
});
