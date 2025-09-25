// src/host/llm.ts
import "dotenv/config";
import fetch from "node-fetch";
import { ConversationMemory } from "./memory.js";
import { logJsonl } from "./logger.js";

const API = "https://api.anthropic.com/v1/messages";
const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL;

type Plan = { tool: string; args: any; server?: "local" | "fs" | "git" };

export async function llmPlan(
  goal: string,
  mem: ConversationMemory
): Promise<Plan> {
  // Fallback heurístico si no hay API
  if (!KEY) {
    // Reglas simples
    if (/subt/i.test(goal))
      return {
        tool: "subtitles",
        args: {
          video: "clip_0.mp4",
          transcript: "samples/transcripts/transcript_test1.srt",
        },
        server: "local",
      };
    if (/publish|youtube|tiktok|instagram/i.test(goal))
      return {
        tool: "publish",
        args: {
          platform: "youtube",
          file: "clip_0.mp4",
          title: "My Short",
          hashtags: ["#shorts"],
        },
        server: "local",
      };
    // default → clips
    return {
      tool: "clips",
      args: {
        video: "src/samples/videos/videoSample1.mp4",
        transcript: "src/samples/transcripts/transcript_test1.srt",
        count: 2,
        minSec: 20,
        maxSec: 30,
      },
      server: "local",
    };
  }

  const history = mem
    .latest(6)
    .map((t) => `${t.role.toUpperCase()}: ${t.text}`)
    .join("\n");
  const system =
    "You are a planner for a console host that can call MCP tools. " +
    "Output ONLY one JSON object with fields: tool (string), args (object), server (local|fs|git optional). " +
    "Available local tools: clips, subtitles, publish, transcribe. Prefer local unless explicitly about filesystem or git.";

  const body = {
    model: MODEL,
    max_tokens: 300,
    system,
    messages: [{ role: "user", content: `${history}\nGOAL: ${goal}` }],
  };

  const r = await fetch(API, {
    method: "POST",
    headers: {
      "x-api-key": KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const j = (await r.json()) as any;
  const text: string = j?.content?.[0]?.text ?? "";
  const json = text.match(/\{[\s\S]*\}$/)?.[0] ?? text.trim();
  try {
    return JSON.parse(json) as Plan;
  } catch {
    return {
      tool: "clips",
      args: {
        video: "src/samples/videos/videoSample1.mp4",
        transcript: "samples/transcripts/transcript_test1.srt",
        count: 2,
        minSec: 20,
        maxSec: 30,
      },
      server: "local",
    };
  }
}

function memoryToAnthropic(mem: ConversationMemory) {
  return mem.latest(12).map((t) => ({
    role: t.role === "assistant" ? "assistant" : "user",
    content: t.text,
  }));
}

export async function llmChat(
  userInput: string,
  mem: ConversationMemory
): Promise<string> {
  logJsonl("llm.jsonl", { dir: "in", kind: "chat", text: userInput });

  if (!KEY) {
    const fallback =
      "I don't have API access in this environment. Please set ANTHROPIC_API_KEY to enable general Q&A.";
    logJsonl("llm.jsonl", { dir: "out", kind: "chat", text: fallback });
    return fallback;
  }

  const messages = [
    ...memoryToAnthropic(mem),
    { role: "user", content: userInput },
  ];
  const body = {
    model: MODEL,
    max_tokens: 400,
    system: "You are a helpful assistant. Answer directly and concisely.",
    messages,
  };

  const r = await fetch(API, {
    method: "POST",
    headers: {
      "x-api-key": KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const j = (await r.json()) as any;
  const text: string = j?.content?.[0]?.text ?? "(no response)";
  logJsonl("llm.jsonl", { dir: "out", kind: "chat", text });
  return text;
}
