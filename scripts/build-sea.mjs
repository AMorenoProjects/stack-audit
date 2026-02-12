/**
 * Builds a Node.js Single Executable Application (SEA).
 *
 * This script:
 * 1. Generates the SEA preparation blob from the bundled dist/index.js
 * 2. Copies the node binary
 * 3. Injects the blob using postject
 *
 * Requires Node.js >= 20 for SEA support.
 * See: https://nodejs.org/api/single-executable-applications.html
 */

import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { platform } from "node:os";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const RELEASE_DIR = join(ROOT, "release");
const SEA_CONFIG = join(ROOT, "sea-config.json");
const BLOB_PATH = join(RELEASE_DIR, "sea-prep.blob");

const os = platform();
const targetName = { linux: "linux", darwin: "macos", win32: "win" }[os] ?? os;
const ext = os === "win32" ? ".exe" : "";
const binaryName = `stackaudit-${targetName}${ext}`;
const binaryPath = join(RELEASE_DIR, binaryName);

/**
 * Uses execFileSync (no shell) to avoid injection via paths with
 * spaces or special characters. Arguments are passed as an array,
 * not concatenated into a shell string.
 */
function run(cmd, args) {
  console.log(`  $ ${cmd} ${args.join(" ")}`);
  execFileSync(cmd, args, { stdio: "inherit", cwd: ROOT });
}

mkdirSync(RELEASE_DIR, { recursive: true });

// Step 1: Write SEA config
const seaConfig = {
  main: "dist/index.js",
  output: "release/sea-prep.blob",
  disableExperimentalSEAWarning: true,
  useCodeCache: true,
};
writeFileSync(SEA_CONFIG, JSON.stringify(seaConfig, null, 2));
console.log("\n[1/4] Generated sea-config.json");

// Step 2: Generate the blob
run("node", ["--experimental-sea-config", SEA_CONFIG]);
console.log("[2/4] Generated SEA blob");

// Step 3: Copy the node binary
copyFileSync(process.execPath, binaryPath);

if (os !== "win32") {
  chmodSync(binaryPath, 0o755);
}
console.log(`[3/4] Copied Node binary → ${binaryName}`);

// Step 4: Inject the blob using postject
const postjectArgs = [
  "--yes", "postject",
  binaryPath,
  "NODE_SEA_BLOB",
  BLOB_PATH,
  "--sentinel-fuse", "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
];

if (os === "darwin") {
  postjectArgs.push("--macho-segment-name", "NODE_SEA");
}

run("npx", postjectArgs);

console.log(`[4/4] Injected SEA blob → ${binaryPath}`);
console.log(`\nDone! Binary: ${binaryPath}\n`);
