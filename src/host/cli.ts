import readline from "node:readline";
import { MCPClient } from "./mcpClient.js";
import { servers } from "./config.js";
import { ConversationMemory } from "./memory.js";
import { llmChat, llmPlan } from "./llm.js";
import { routeCall } from "./router.js";
import { logJsonl } from "./logger.js";
import "dotenv/config";
import { runAgentRepoWorkflow } from "./agent.js";

async function main() {
  const mem = new ConversationMemory(12);

  // Conecta servidores
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

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "host> ",
  });
  console.error("Host ready. Escribe /help para ver comandos.");
  rl.prompt();

  rl.on("line", async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }
    logJsonl("host.jsonl", { dir: "in", input });
    mem.push("user", input);

    try {
      if (input === "/help") {
        console.error(
          `Comandos:
          /servers                        - mostrar servidores disponibles
          /tools [server]                 - listar tools del servidor (local|fs|git)
          /call <server> <tool> <json>    - llamar un tool con JSON
          /clips <video> <count> <min> <max>
          /subtitles <video> <srt>
          /publish <platform> <file> <...title>
          /ask <pregunta>                 - Q&A general con memoria (LLM)
          !plan <objetivo>                - Fuerza planner + tools
          (Sin /)                         - Modo chat: primero Q&A; si pones !plan, usa planner`
        );
        rl.prompt();
        return;
      }

      if (input === "/servers") {
        console.error(`Servers:
          local: ${servers.local.cmd} ${servers.local.args.join(" ")}
          fs: ${
            servers.fs
              ? servers.fs.cmd + " " + servers.fs.args.join(" ")
              : "(no configurado)"
          }
          git: ${
            servers.git
              ? servers.git.cmd + " " + servers.git.args.join(" ")
              : "(no configurado)"
          }`);

        rl.prompt();
        return;
      }

      if (input.startsWith("/tools")) {
        const [, target = "local"] = input.split(/\s+/);
        const client =
          target === "fs" ? fsClient : target === "git" ? gitClient : local;
        if (!client) {
          console.error(`Server '${target}' no disponible`);
          rl.prompt();
          return;
        }
        const tools = await client.listTools();
        console.error("Tools:", tools.map((t) => t.name).join(", "));
        rl.prompt();
        return;
      }

      if (input.startsWith("/call ")) {
        const m = input.match(/^\/call\s+(\w+)\s+(\w+)\s+(.+)$/);
        if (!m) {
          console.error("Uso: /call <server> <tool> <jsonArgs>");
          rl.prompt();
          return;
        }
        const [, target, tool, jsonArgs] = m;
        const args = JSON.parse(jsonArgs);
        const txt = await routeCall(
          { local, fs: fsClient, git: gitClient },
          tool,
          args,
          target as any
        );
        console.error("<>", txt);
        mem.push("assistant", txt);
        rl.prompt();
        return;
      }

      if (input.startsWith("/clips ")) {
        const [, video, count, minSec, maxSec] = input.split(/\s+/);
        const args = {
          video,
          transcript: "src/samples/transcripts/transcript_test1.srt",
          count: Number(count ?? 2),
          minSec: Number(minSec ?? 20),
          maxSec: Number(maxSec ?? 30),
          withGameplay: false,
        };
        const txt = await routeCall(
          { local, fs: fsClient, git: gitClient },
          "clips",
          args,
          "local"
        );
        console.error("<>", txt);
        mem.push("assistant", txt);
        rl.prompt();
        return;
      }

      if (input.startsWith("/subtitles ")) {
        const [, video, srt] = input.split(/\s+/);
        const txt = await routeCall(
          { local, fs: fsClient, git: gitClient },
          "subtitles",
          { video, transcript: srt },
          "local"
        );
        console.error("<>", txt);
        mem.push("assistant", txt);
        rl.prompt();
        return;
      }

      if (input.startsWith("/publish ")) {
        const parts = input.split(/\s+/);
        const platform = parts[1];
        const file = parts[2];
        const title = parts.slice(3).join(" ") || "My Short";
        const txt = await routeCall(
          { local, fs: fsClient, git: gitClient },
          "publish",
          { platform, file, title, hashtags: ["#shorts"] },
          "local"
        );
        console.error("<>", txt);
        mem.push("assistant", txt);
        rl.prompt();
        return;
      }

      if (input.startsWith("/ask ")) {
        const question = input.slice(5).trim();
        const answer = await llmChat(question, mem);
        console.error(answer);
        mem.push("assistant", answer);
        rl.prompt();
        return;
      }

      if (input.startsWith("/agent ")) {
        const instruction = input.slice(7).trim();
        if (!instruction) {
          console.error("Uso: /agent <instruccion en lenguaje natural>");
          rl.prompt();
          return;
        }
        try {
          const result = await runAgentRepoWorkflow(
            fsClient,
            gitClient,
            instruction
          );
          console.error("Agent plan");
          console.error(JSON.stringify(result.steps, null, 2));
          console.error("Agent Outputs");
          console.error(JSON.stringify(result.outputs, null, 2));
        } catch (e: any) {
          console.error("Agent error:", e.message);
        }

        rl.prompt();
        return;
      }

      if (input.startsWith("!plan ")) {
        const goal = input.slice(6).trim();
        const plan = await llmPlan(goal, mem);
        const target = (plan.server ?? "local") as "local" | "fs" | "git";
        const txt = await routeCall(
          { local, fs: fsClient, git: gitClient },
          plan.tool,
          plan.args,
          target
        );
        console.error("Plan:", JSON.stringify(plan));
        console.error("<>", txt);
        mem.push("assistant", txt);
        rl.prompt();
        return;
      } else {
        // Q&A normal
        const answer = await llmChat(input, mem);
        console.error(answer);
        mem.push("assistant", answer);
        rl.prompt();
        return;
      }
    } catch (err: any) {
      console.error("Error:", err?.message || String(err));
      logJsonl("host.jsonl", {
        dir: "err",
        message: err?.message,
        stack: err?.stack,
      });
      rl.prompt();
    }
  });

  rl.on("SIGINT", async () => {
    await local.stop();
    if (fsClient) await fsClient.stop();
    if (gitClient) await gitClient.stop();
    process.exit(0);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
