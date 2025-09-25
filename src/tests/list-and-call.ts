import { spawn } from "node:child_process";

function send(p: any, obj: unknown) {
  p.stdin.write(JSON.stringify(obj) + "\n");
}

let buf = "";
const srv = spawn("node", ["dist/index.js"], {
  stdio: ["pipe", "pipe", "inherit"],
});

srv.stdout.on("data", (chunk: Buffer) => {
  buf += chunk.toString("utf8");
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    const msg = JSON.parse(line);
    console.log("RX:\n" + JSON.stringify(msg, null, 2));

    if (msg.id === 1 && msg.result) {
      send(srv, { jsonrpc: "2.0", method: "initialized" });
      send(srv, { jsonrpc: "2.0", id: 2, method: "tools/list" });
    }
    if (msg.id === 2 && msg.result) {
      send(srv, {
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
            maxSec: 25,
            withGameplay: false,
          },
        },
      });
    }
    if (msg.id === 3) {
      const c0 = msg.result?.content?.[0];
      if (msg.result?.isError)
        console.error("Tool error:", c0?.text ?? "(no text)");
      else console.log("Tool ok:", c0?.text);
      srv.stdin.end();
      srv.kill();
    }
  }
});

// initialize
send(srv, {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "local-test", version: "0.0.1" },
  },
});
