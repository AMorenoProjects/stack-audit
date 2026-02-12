import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { checkFiles } from "../../src/checks/files.js";

const TEST_DIR = join(process.cwd(), ".tmp-files-test");

describe("checkFiles", () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it("passes for files that exist", async () => {
    await writeFile(join(TEST_DIR, "app.js"), "// app");
    await writeFile(join(TEST_DIR, "config.json"), "{}");

    // Relative paths from CWD (as a real config would use)
    const checker = checkFiles([
      ".tmp-files-test/app.js",
      ".tmp-files-test/config.json",
    ]);
    const results = await checker();

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.status === "pass")).toBe(true);
  });

  it("fails for files that do not exist", async () => {
    const checker = checkFiles([".tmp-files-test/ghost.txt"]);
    const results = await checker();

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("fail");
    expect(results[0].message).toContain("not found");
  });

  it("handles mixed existing and missing files", async () => {
    await writeFile(join(TEST_DIR, "real.txt"), "data");

    const checker = checkFiles([
      ".tmp-files-test/real.txt",
      ".tmp-files-test/fake.txt",
    ]);
    const results = await checker();

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe("pass");
    expect(results[1].status).toBe("fail");
  });

  it("rejects path traversal attempts", async () => {
    const checker = checkFiles(["../../etc/passwd"]);
    const results = await checker();

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("fail");
    expect(results[0].message).toContain("Path traversal");
  });

  it("rejects absolute paths", async () => {
    const checker = checkFiles(["/etc/passwd"]);
    const results = await checker();

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("fail");
    expect(results[0].message).toContain("Absolute paths");
  });
});
