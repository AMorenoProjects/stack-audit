import { createConnection } from "node:net";
import { timedCheck } from "../utils/system.js";
import type { CheckResult, PortConfig } from "../types.js";

const DEFAULT_TIMEOUT_MS = 3000;

/**
 * Checks if a TCP port is accepting connections on localhost.
 * Uses a raw TCP socket with a timeout — no data is sent.
 */
function probePort(port: number, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: "127.0.0.1" });

    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeoutMs);

    socket.on("connect", () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });

    socket.on("error", () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(false);
    });
  });
}

export function checkPorts(portsConfig: PortConfig[]): () => Promise<CheckResult[]> {
  return async () => {
    const results: CheckResult[] = [];

    for (const portDef of portsConfig) {
      const result = await timedCheck(
        `Port ${portDef.port} (${portDef.name})`,
        async () => {
          const isOpen = await probePort(portDef.port);

          if (isOpen) {
            return {
              status: "pass" as const,
              message: `${portDef.name} is accepting connections on port ${portDef.port}`,
            };
          }

          return {
            status: "fail" as const,
            message: `Nothing listening on port ${portDef.port}. Is ${portDef.name} running?`,
          };
        },
      );

      results.push(result);
    }

    return results;
  };
}
