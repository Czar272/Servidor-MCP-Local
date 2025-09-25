import readline from "node:readline";
import { MCPClient } from "./mcpClient.js";
import { llmPlan } from "./llm.js";
import { servers } from "./config.js";
import { logJsonl } from "./logger.js";

type Memory = {
  turns: { role: "user" | "assistant"; text: string }[];
  summary?: string;
};
const mem: Memory = { turns: [] };

function addMemory(role: "user" | "assistant", text: string) {
  mem.turns.push({ role, text });
  if (mem.turns.length > 12) mem.turns.shift();
}

async function main() {
  // Conecta MCP servers
  const local = new MCPClient("repurpose-local");
  await local.start(servers.local.cmd, servers.local.args);

  let fsClient: MCPClient | null = null;
  if (servers.fs) {
    fsClient = new MCPClient("fs");
    await fsClient.start(servers.fs.cmd, servers.fs.args);
  }

  let gitClient: MCPClient | null = null;
  if (servers.git) {
    gitClient = new MCPClient("git");
    await gitClient.start(servers.git.cmd, servers.git.args);
  }

  // CLI
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  console.error(
    "💬 Host ready. Escribe comandos (ej: /clips samples/videos/videoSample1.mp4 2 20 30)"
  );

  rl.on("line", async (line) => {
    const input = line.trim();
    addMemory("user", input);
    logJsonl("host.jsonl", { dir: "in", input });

    // Comandos directos (para demo)
    const parts = input.split(/\s+/);
    if (parts[0] === "/clips") {
      const [_, video, count, minSec, maxSec] = parts;
      const res = await local.callTool("clips", {
        video,
        transcript: "samples/transcripts/transcript_test1.srt",
        count: Number(count ?? 2),
        minSec: Number(minSec ?? 20),
        maxSec: Number(maxSec ?? 30),
        withGameplay: false,
      });
      console.error(
        "▶ clips:",
        res.result?.content?.[0]?.text ?? res.error?.message
      );
      addMemory("assistant", res.result?.content?.[0]?.text ?? "");
      return;
    }
    if (parts[0] === "/subtitles") {
      const [_, video, srt] = parts;
      const res = await local.callTool("subtitles", { video, transcript: srt });
      console.error(
        "▶ subtitles:",
        res.result?.content?.[0]?.text ?? res.error?.message
      );
      addMemory("assistant", res.result?.content?.[0]?.text ?? "");
      return;
    }
    if (parts[0] === "/publish") {
      const [_, platform, file, ...titleParts] = parts;
      const title = titleParts.join(" ") || "My Short";
      const res = await local.callTool("publish", {
        platform,
        file,
        title,
        hashtags: ["#shorts"],
      });
      console.error(
        "▶ publish:",
        res.result?.content?.[0]?.text ?? res.error?.message
      );
      addMemory("assistant", res.result?.content?.[0]?.text ?? "");
      return;
    }

    // Si no es comando → usar LLM para planear
    const planText = await llmPlan(input, mem.summary ?? "");
    console.error("🧭 Plan:", planText);
    let plan: { tool: string; args: any } | null = null;
    try {
      plan = JSON.parse(planText.match(/\{[\s\S]*\}$/)?.[0] ?? planText);
    } catch {}
    if (!plan) {
      console.error("No plan.");
      return;
    }

    // Router simple (solo local por ahora)
    const res = await local.callTool(plan.tool, plan.args);
    console.error(
      "▶ result:",
      res.result?.content?.[0]?.text ?? res.error?.message
    );
    addMemory("assistant", res.result?.content?.[0]?.text ?? "");
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
