import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { handleTranscribe } from "./handlers/transcribe.js";
import { handleSubtitles } from "./handlers/subtitles.js";
import { handleClips } from "./handlers/clips.js";
import { handlePublish } from "./handlers/publish.js";

const TranscribeShape = { file: z.string() };
const TranscribeSchema = z.object(TranscribeShape);

const SubtitlesShape = { video: z.string(), transcript: z.string() };
const SubtitlesSchema = z.object(SubtitlesShape);

const ClipsShape = {
  video: z.string(),
  transcript: z.string(),
  count: z.number().int().positive(),
  minSec: z.number().int().positive(),
  maxSec: z.number().int().positive(),
  withGameplay: z.boolean().optional(),
};
const ClipsSchema = z.object(ClipsShape);

const PublishShape = {
  platform: z.enum(["youtube", "instagram", "tiktok"]),
  file: z.string(),
  title: z.string(),
  hashtags: z.array(z.string()).optional(),
};
const PublishSchema = z.object(PublishShape);

// ---- Servidor MCP ----
const server = new McpServer({ name: "repurposing-local", version: "0.1.0" });

server.registerTool(
  "transcribe",
  {
    title: "Transcribe audio from a video file",
    description:
      "Runs local transcription and returns transcript path or text.",
    inputSchema: TranscribeShape,
  },
  async (args) => {
    const { file } = TranscribeSchema.parse(args);
    const { transcript } = await handleTranscribe({ file });
    return {
      content: [{ type: "text", text: JSON.stringify({ transcript }) }],
    };
  }
);

server.registerTool(
  "subtitles",
  {
    title: "Add subtitles to a video file",
    description: "Burns subtitles into the video using ffmpeg.",
    inputSchema: SubtitlesShape,
  },
  async (args) => {
    const { video, transcript } = SubtitlesSchema.parse(args);
    const { video: out } = await handleSubtitles({ video, transcript });
    return {
      content: [{ type: "text", text: JSON.stringify({ video: out }) }],
    };
  }
);

server.registerTool(
  "clips",
  {
    title: "Generate short clips from a long video",
    description: "Cuts clips (9:16), optional gameplay overlay.",
    inputSchema: ClipsShape,
  },
  async (args) => {
    const parsed = ClipsSchema.parse(args);
    const { clips } = await handleClips(parsed);
    return { content: [{ type: "text", text: JSON.stringify({ clips }) }] };
  }
);

server.registerTool(
  "publish",
  {
    title: "Publish a short",
    description: "Simulated upload to YouTube/Instagram/TikTok.",
    inputSchema: PublishShape,
  },
  async (args) => {
    const { platform, file, title, hashtags = [] } = PublishSchema.parse(args);
    const res = await handlePublish({ platform, file, title, hashtags });
    return { content: [{ type: "text", text: JSON.stringify(res) }] };
  }
);

// Conectar por stdio
await server.connect(new StdioServerTransport());

// Logs a stderr
console.error("MCP Local Repurposing Server running...");
