/**
 * Core type definitions for stackAudit.
 * All checker modules and the runner depend on these contracts.
 */

export type CheckStatus = "pass" | "fail" | "warn" | "skip";

export interface CheckResult {
  /** Human-readable name of the check (e.g. "Node.js Version") */
  name: string;
  /** Outcome of the check */
  status: CheckStatus;
  /** Detail message explaining the result */
  message: string;
  /** Execution time in milliseconds */
  duration: number;
}

export interface AuditReport {
  projectName: string;
  timestamp: Date;
  results: CheckResult[];
  summary: {
    passed: number;
    failed: number;
    warned: number;
    skipped: number;
    total: number;
  };
}

/**
 * A Checker is an async function that receives its specific config slice
 * and returns one or more CheckResults.
 */
export type CheckerFn = () => Promise<CheckResult[]>;

export interface PortConfig {
  port: number;
  name: string;
  type?: "tcp";
}

export interface EnvConfig {
  target: string;
  example: string;
  required: string[];
}

export interface CommandConfig {
  cmd: string;
  match?: string;
  errorMsg?: string;
}

export interface ChecksConfig {
  node?: string;
  npm?: string;
  env?: EnvConfig;
  ports?: PortConfig[];
  files?: string[];
  commands?: CommandConfig[];
}

export interface StackAuditConfig {
  projectName: string;
  version: string;
  checks: ChecksConfig;
}

export interface CLIOptions {
  config: string;
  verbose: boolean;
  ci: boolean;
  json: boolean;
  trustCommands: boolean;
}
