import "dotenv/config";
import fetch from "node-fetch";

const API = "https://api.anthropic.com/v1/messages";
const KEY = process.env.ANTHROPIC_API_KEY ?? "";

export async function llmPlan(
  user: string,
  context: string = ""
): Promise<string> {
  if (!KEY) return "Plan: call clips with count=2, minSec=20, maxSec=30.";
  const body = {
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 300,
    system:
      "You are a planning agent. Given a user goal about repurposing videos, output a single JSON with a 'tool' and 'args'. Tools: clips, subtitles, publish.",
    messages: [{ role: "user", content: `${context}\n\nGoal:\n${user}` }],
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
  const text =
    j?.content?.[0]?.text ??
    'Plan: {"tool":"clips","args":{"count":2,"minSec":20,"maxSec":30}}';
  return text;
}
