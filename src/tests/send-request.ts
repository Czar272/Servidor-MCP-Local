import { spawn } from "node:child_process";
import fs from "node:fs";

function send(server: any, obj: unknown) {
  const s = JSON.stringify(obj) + "\n"; // NDJSON framing
  server.stdin.write(s);
}

async function main() {
  // LEE TU REQUEST (clips)
  const clipsReq = JSON.parse(
    fs.readFileSync("src/requests/clips.json", "utf8")
  );

  // LANZA EL SERVER (STDIO)
  const server = spawn("node", ["dist/index.js"], {
    stdio: ["pipe", "pipe", "inherit"], // stdout -> JSON-RPC; logs a stderr
  });

  // ACUMULA RESPUESTAS
  let buffer = "";
  server.stdout.on("data", (chunk: Buffer) => {
    buffer += chunk.toString("utf8");
    // Procesa por líneas (NDJSON)
    let idx: number;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line);
        console.log("RX:", msg);

        // Cuando recibimos la respuesta a initialize (id=1), enviamos initialized y luego tools/call
        if (msg.id === 1 && msg.result) {
          // Enviar 'initialized' (notificación sin id)
          send(server, { jsonrpc: "2.0", method: "initialized" });
          // Enviar tu tools/call (id=2)
          send(server, {
            jsonrpc: "2.0",
            id: 2,
            method: "tools/call",
            params: {
              name: clipsReq.params.name,
              arguments: clipsReq.params.arguments,
            },
          });
        }

        // Cuando llega la respuesta del tools/call (id=2), terminamos
        if (msg.id === 2) {
          server.stdin.end();
          server.kill();
        }
      } catch (e) {
        console.error("⚠️ Línea no-JSON en stdout:", line);
      }
    }
  });

  // 1) initialize (id=1)
  send(server, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "local-test-client", version: "0.0.1" },
    },
  });
}

main().catch((e) => {
  console.error("Client error:", e);
  process.exit(1);
});
