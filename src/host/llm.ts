import "dotenv/config";
import fetch from "node-fetch";
import { ConversationMemory } from "./memory.js";
import { logJsonl } from "./logger.js";

const API = "https://api.anthropic.com/v1/messages";
const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL;

type AnthropicTextBlock = { type: "text"; text: string };
type AnthropicMessageOk = {
  id: string;
  type: "message";
  role: "assistant";
  content: AnthropicTextBlock[];
  stop_reason?: string | null;
  stop_sequence?: string | null;
};
type AnthropicError = {
  type: "error";
  error: { type: string; message: string };
};

type AnthropicResponse =
  | AnthropicMessageOk
  | AnthropicError
  | Record<string, unknown>;

type Plan = { tool: string; args: any; server?: "local" | "fs" | "git" };
type Opts = { maxTokens?: number };

export async function askLLM(system: string, user: string, opts: Opts = {}) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-1-20250805",
      max_tokens: opts.maxTokens ?? 800,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  // Error HTTP
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Anthropic HTTP ${res.status}: ${txt}`);
  }

  const data = (await res.json()) as AnthropicResponse;

  // Error de la API
  if ((data as AnthropicError).type === "error") {
    const e = (data as AnthropicError).error;
    throw new Error(`Anthropic API error: ${e.type}: ${e.message}`);
  }

  const msg = data as AnthropicMessageOk;
  const text = msg?.content?.[0]?.type === "text" ? msg.content[0].text : "";

  return (text ?? "").trim();
}

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
