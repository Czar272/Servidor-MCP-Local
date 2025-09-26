import { MCPClient } from "./mcpClient.js";
import { askLLM } from "./llm.js";
import { logJsonl } from "./logger.js";

type PlanStep =
  | {
      tool: "clips";
      args: {
        video: string;
        transcript: string;
        count: number;
        minSec: number;
        maxSec: number;
        withGameplay?: boolean;
      };
    }
  | { tool: "subtitles"; args: { video: string; transcript: string } }
  | {
      tool: "publish";
      args: {
        platform: "youtube" | "instagram" | "tiktok";
        file: string;
        title: string;
        hashtags?: string[];
      };
    };

type Plan = { objective: string; steps: PlanStep[] };

function extractJsonObject(input: string): string {
  const fence = input.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) return fence[1].trim();
  const first = input.indexOf("{"),
    last = input.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first)
    return input.slice(first, last + 1).trim();
  return input.trim();
}

export async function runAgentRepurpose(
  local: MCPClient,
  instruction: string,
  defaults?: Partial<{
    count: number;
    minSec: number;
    maxSec: number;
    withGameplay: boolean;
  }>
) {
  const tools = await local.listTools();
  const toolNames = new Set(tools.map((t) => t.name));
  if (!toolNames.has("clips"))
    throw new Error("El server local no expone la tool 'clips'.");

  const sys = `You plan tool calls for a local "repurposing" MCP server.
Output ONLY a JSON object (no markdown) with schema:
{ "objective": string, "steps": [
  { "tool": "clips", "args": { "video": string, "transcript": string, "count": number, "minSec": number, "maxSec": number, "withGameplay"?: boolean } },
  { "tool": "subtitles", "args": { "video": string, "transcript": string } } ... optionally publish
]}
Rules:
- Use ONLY tools actually available: ${[...toolNames].join(", ")}.
- First call must be "clips".
- If instruction asks for subtitles, add one "subtitles" step per resulting clip (we will substitute the 'video' path afterwards).
- Keep paths as provided by the user (relative ok).
- Do not include code fences or explanations.`;

  const user = `Instruction: ${instruction}
    Defaults (if missing): count=${defaults?.count ?? 3}, minSec=${
    defaults?.minSec ?? 20
  }, maxSec=${defaults?.maxSec ?? 45}, withGameplay=${
    defaults?.withGameplay ?? false
  }.
    Return ONLY JSON.`;

  const rawText = await askLLM(sys, user, { maxTokens: 800 });
  logJsonl("repurpose.plan.raw.jsonl", { rawText });

  let plan: Plan;
  try {
    plan = JSON.parse(extractJsonObject(rawText));
  } catch (e) {
    throw new Error("Planner did not return valid JSON for repurposing: " + e);
  }

  // Ejecutar plan
  const outputs: any[] = [];

  // clips
  const first = plan.steps.find((s) => s.tool === "clips") as
    | PlanStep
    | undefined;
  if (!first) throw new Error("Plan did not include 'clips' step.");
  const clipsRes = await local.callTool("clips", first.args);
  outputs.push({ step: "clips", res: clipsRes });
  const text = clipsRes?.result?.content?.[0]?.text ?? "";
  let clips: string[] = [];
  try {
    const obj = JSON.parse(text);
    clips = obj?.clips ?? [];
  } catch {}
  if (!Array.isArray(clips) || clips.length === 0) {
    throw new Error("No clips returned by 'clips' tool.");
  }

  // subtitles (si el plan lo pidió)
  const needsSubtitles = plan.steps.some((s) => s.tool === "subtitles");
  if (needsSubtitles) {
    // recuperar transcript original del paso de clips
    const transcriptPath = (first.args as any).transcript as string;
    for (const clip of clips) {
      const args = { video: clip, transcript: transcriptPath };
      const subRes = await local.callTool("subtitles", args);
      outputs.push({ step: "subtitles", video: clip, res: subRes });
    }
  }

  // publish
  for (const s of plan.steps) {
    if (s.tool === "publish") {
      // Si el user no especifica "file", usa el primer clip subtitulado o el primero del array
      const pubArgs = { ...s.args };
      if (!pubArgs.file) pubArgs.file = clips[0];
      const pubRes = await local.callTool("publish", pubArgs);
      outputs.push({ step: "publish", res: pubRes });
    }
  }

  return { plan, clips, outputs };
}
