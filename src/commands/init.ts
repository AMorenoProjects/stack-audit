import { access, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { logError, logInfo, logSuccess, logWarn } from "../utils/logger.js";
import { execCommand } from "../utils/system.js";
import type { ChecksConfig } from "../types.js";

const CONFIG_FILENAME = "stackAudit.config.json";

interface InitOptions {
  detect: boolean;
}

/**
 * Probes for a command and returns its version, or null if not found.
 */
async function probeToolVersion(cmd: string): Promise<string | null> {
  try {
    const output = await execCommand(cmd);
    return output.trim();
  } catch {
    return null;
  }
}

/**
 * Detects common project files in the current directory.
 */
async function detectFiles(candidates: string[]): Promise<string[]> {
  const found: string[] = [];
  for (const file of candidates) {
    try {
      await access(resolve(process.cwd(), file));
      found.push(file);
    } catch {
      // not present
    }
  }
  return found;
}

/**
 * Tries to read the project name from package.json.
 */
async function detectProjectName(): Promise<string> {
  try {
    const raw = await readFile(resolve(process.cwd(), "package.json"), "utf-8");
    const pkg = JSON.parse(raw);
    if (typeof pkg.name === "string" && pkg.name.length > 0) {
      return pkg.name;
    }
  } catch {
    // ignore
  }
  return basename(process.cwd());
}

/**
 * Builds a smart config by probing the local environment.
 */
async function buildDetectedConfig(): Promise<{ projectName: string; version: string; checks: ChecksConfig }> {
  const checks: ChecksConfig = {};

  // Detect Node.js
  const nodeVersion = await probeToolVersion("node --version");
  if (nodeVersion) {
    const major = nodeVersion.replace(/^v/, "").split(".")[0];
    checks.node = `>=${major}.0.0`;
    logSuccess(`Detected Node.js ${nodeVersion} → requiring >=${major}.0.0`);
  }

  // Detect npm
  const npmVersion = await probeToolVersion("npm --version");
  if (npmVersion) {
    const major = npmVersion.split(".")[0];
    checks.npm = `>=${major}.0.0`;
    logSuccess(`Detected npm ${npmVersion} → requiring >=${major}.0.0`);
  }

  // Detect common project files
  const commonFiles = [
    "package.json",
    "docker-compose.yml",
    "docker-compose.yaml",
    "Dockerfile",
    "Makefile",
    ".env.example",
    "tsconfig.json",
  ];

  const foundFiles = await detectFiles(commonFiles);
  if (foundFiles.length > 0) {
    checks.files = foundFiles;
    logSuccess(`Detected ${foundFiles.length} project files: ${foundFiles.join(", ")}`);
  }

  // Detect .env.example and extract required keys
  const envExamplePath = resolve(process.cwd(), ".env.example");
  try {
    const content = await readFile(envExamplePath, "utf-8");
    const keys = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.split("=")[0].trim())
      .filter((key) => key.length > 0);

    if (keys.length > 0) {
      checks.env = {
        target: ".env",
        example: ".env.example",
        required: keys,
      };
      logSuccess(`Detected ${keys.length} env vars from .env.example: ${keys.join(", ")}`);
    }
  } catch {
    // No .env.example
  }

  // Detect Docker
  const dockerVersion = await probeToolVersion("docker --version");
  if (dockerVersion) {
    checks.commands = [
      {
        cmd: "docker info",
        match: "Server Version",
        errorMsg: "Docker daemon is not running. Start Docker Desktop or the Docker service.",
      },
    ];
    logSuccess(`Detected Docker → adding daemon check`);
  }

  const projectName = await detectProjectName();

  return {
    projectName,
    version: "1.0.0",
    checks,
  };
}

/**
 * Generates a stackAudit.config.json in the current directory.
 * With --detect, probes the local environment to auto-populate config.
 */
export async function initCommand(options: InitOptions): Promise<void> {
  const targetPath = resolve(process.cwd(), CONFIG_FILENAME);

  try {
    await access(targetPath);
    throw new Error(
      `${CONFIG_FILENAME} already exists in this directory. Delete it first to re-initialize.`,
    );
  } catch {
    // File does not exist — proceed
  }

  let config;

  if (options.detect) {
    logInfo("Scanning environment...\n");
    config = await buildDetectedConfig();

    if (Object.keys(config.checks).length === 0) {
      logWarn("No tools detected. Generating a minimal config.");
      config.checks = { node: ">=18.0.0" };
    }

    console.log("");
  } else {
    config = {
      projectName: await detectProjectName(),
      version: "1.0.0",
      checks: {
        node: ">=18.0.0",
        npm: ">=9.0.0",
        files: ["package.json"],
      },
    };
  }

  try {
    const content = JSON.stringify(config, null, 2) + "\n";
    await writeFile(targetPath, content, "utf-8");
    logSuccess(`Created ${CONFIG_FILENAME} — customize it for your project.`);
  } catch (error) {
    throw new Error(
      `Failed to write ${CONFIG_FILENAME}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
