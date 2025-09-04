import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { handleTranscribe } from "./handlers/transcribe.js";
import { handleSubtitles } from "./handlers/subtitles.js";
import { handleClips } from "./handlers/clips.js";
import { handlePublish } from "./handlers/publish.js";

// Crear servidor MCP
const server = new Server(
  { name: "repurposing-local", version: "0.1.0" },
  {
    capabilities: {
      tools: {
        transcribe: {
          description: "Transcribe audio from a video file",
          inputSchema: {
            type: "object",
            properties: { file: { type: "string" } },
            required: ["file"],
          },
          handler: handleTranscribe,
        },
        subtitles: {
          description: "Add subtitles to a video file",
          inputSchema: {
            type: "object",
            properties: {
              video: { type: "string" },
              transcript: { type: "string" },
            },
            required: ["video", "transcript"],
          },
          handler: handleSubtitles,
        },
        clips: {
          description: "Generate short clips from a long video",
          inputSchema: {
            type: "object",
            properties: {
              video: { type: "string" },
              transcript: { type: "string" },
              count: { type: "number" },
              minSec: { type: "number" },
              maxSec: { type: "number" },
              withGameplay: { type: "boolean" },
            },
            required: ["video", "transcript", "count", "minSec", "maxSec"],
          },
          handler: handleClips,
        },
        publish: {
          description: "Publish a video to YouTube, Instagram, or TikTok",
          inputSchema: {
            type: "object",
            properties: {
              platform: { type: "string" },
              file: { type: "string" },
              title: { type: "string" },
              hashtags: { type: "array", items: { type: "string" } },
            },
            required: ["platform", "file", "title"],
          },
          handler: handlePublish,
        },
      },
    },
  }
);

// Conectar por stdio (1.17.x usa StdioServerTransport)
await server.connect(new StdioServerTransport());

console.log("🎬 MCP Local Repurposing Server running...");
