// list-models.js (ESM)
import "dotenv/config";
import fetch from "node-fetch";

const MODEL = process.env.ANTHROPIC_MODEL;

const r = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  },
  body: JSON.stringify({
    model: MODEL,
    max_tokens: 50,
    messages: [{ role: "user", content: "Say hello" }],
  }),
});
console.log(await r.json());
