import { spawn } from "node:child_process";

function send(server: any, obj: unknown) {
  server.stdin.write(JSON.stringify(obj) + "\n");
}

let buf = "";
const server = spawn("node", ["dist/index.js"], {
  stdio: ["pipe", "pipe", "inherit"],
});

server.stdout.on("data", (chunk: Buffer) => {
  buf += chunk.toString("utf8");
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;

    const msg = JSON.parse(line);
    console.log("🔵 RX: \n", JSON.stringify(msg, null, 2));

    // 1) tras initialize OK, pide tools/list
    if (msg.id === 1 && msg.result) {
      send(server, { jsonrpc: "2.0", method: "initialized" });
      send(server, { jsonrpc: "2.0", id: 2, method: "tools/list" });
    }

    // 2) cuando llega tools/list, llama a clips
    if (msg.id === 2 && msg.result) {
      // llama a 'clips'
      send(server, {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "clips",
          arguments: {
            video: "src/samples/videos/videoSample1.mp4",
            transcript: "src/samples/transcripts/transcript_test1.srt",
            count: 2,
            minSec: 20,
            maxSec: 30,
            withGameplay: false,
          },
        },
      });
    }

    // 3) al recibir respuesta del call, cierra
    if (msg.id === 3) {
      const c0 = msg.result?.content?.[0];
      if (msg.result?.isError) {
        console.error("Tool Error: ", c0?.text ?? "(sin mensaje)");
      } else {
        console.log("Tool ok: ", c0.text);
      }

      server.stdin.end();
      server.kill();
    }
  }
});

// initialize
send(server, {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "local-test-client", version: "0.0.1" },
  },
});
