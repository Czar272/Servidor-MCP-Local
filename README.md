# Repurposing MCP Local Server + Host CLI

## Overview

This project implements a local MCP server that repurposes long-form videos (podcasts, interviews, livestreams) into short vertical clips ready for TikTok/Instagram. It provides tools for transcription, subtitles, clip generation (9:16), optional gameplay overlay, and simulated publishing. A console Host orchestrates the MCP tools and logs all JSON-RPC traffic as NDJSON.

## Requirements

- Node.js >= 20
- FFmpeg is bundled via `ffmpeg-static` (no global install needed)
- (Optional) Anthropic API key for planning

## Install

```bash
npm install
cp .env.example .env
npm run build
```

## Run Host

```bash
npm run host
# then type commands:
# /clips samples/videos/videoSample1.mp4 2 20 30
# /subtitles clip_0.mp4 samples/transcripts/transcript_test1.srt
# /publish youtube clip_0.mp4 "My Short Title"
```

## Logs

- logs/repurpose-local.tx.jsonl / .rx.jsonl – JSON-RPC frames
- logs/host.jsonl – host console inputs/outputs

## Testing Via Client

```bash
npm run demo:clips
```
