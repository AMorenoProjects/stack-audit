import { describe, it, expect, afterEach } from "vitest";
import { createServer, type Server } from "node:net";
import { checkPorts } from "../../src/checks/ports.js";

let server: Server | null = null;

function startTcpServer(port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.listen(port, "127.0.0.1", () => resolve(s));
    s.on("error", reject);
  });
}

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = null;
  }
});

describe("checkPorts", () => {
  it("passes when the port is listening", async () => {
    // Bind to a random available port
    server = await startTcpServer(0);
    const boundPort = (server.address() as { port: number }).port;

    const checker = checkPorts([
      { port: boundPort, name: "Test Service" },
    ]);

    const results = await checker();
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("pass");
    expect(results[0].message).toContain("accepting connections");
  });

  it("fails when nothing is listening on the port", async () => {
    // Port 19 (chargen) is almost certainly unused
    const checker = checkPorts([
      { port: 19, name: "Nothing" },
    ]);

    const results = await checker();
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("fail");
    expect(results[0].message).toContain("Nothing listening");
  });

  it("checks multiple ports independently", async () => {
    server = await startTcpServer(0);
    const boundPort = (server.address() as { port: number }).port;

    const checker = checkPorts([
      { port: boundPort, name: "Open" },
      { port: 19, name: "Closed" },
    ]);

    const results = await checker();
    expect(results).toHaveLength(2);
    expect(results[0].status).toBe("pass");
    expect(results[1].status).toBe("fail");
  });
});
