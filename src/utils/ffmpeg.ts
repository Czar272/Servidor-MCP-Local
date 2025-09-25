import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { resolveMediaPath } from "./path.js";

const execFileAsync = promisify(execFile);

function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath as string, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    p.stderr.on("data", (d) => (stderr += d.toString()));
    p.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`ffmpeg exited ${code}\n${stderr}`))
    );
  });
}

function pickDefaultFont(): string | null {
  const candidates = [
    "C:/Windows/Fonts/arial.ttf",
    "C:/Windows/Fonts/ARIAL.TTF",
    "C:/Windows/Fonts/segoeui.ttf",
    "C:/Windows/Fonts/tahoma.ttf",
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  return null;
}

// escapar backslashes y los ':' de rutas Windows
function escapeForDrawtext(p: string): string {
  return p.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

export async function cutClips(
  video: string,
  count: number,
  minSec: number,
  maxSec: number
): Promise<string[]> {
  const src = path.isAbsolute(video)
    ? video
    : path.resolve(process.cwd(), video);
  if (!fs.existsSync(src)) throw new Error(`Video not found: ${src}`);

  const clips: string[] = [];
  const dur = Math.max(1, Math.min(maxSec, minSec)); // usa minSec como duración (simple y estable)
  const font = pickDefaultFont(); // si no hay font, seguimos sin texto

  for (let i = 0; i < count; i++) {
    const start = i * (dur + 1); // pequeño gap para evitar borde de GOP
    const out = path.resolve(`clip_${i}.mp4`);

    // 9:16 + texto arriba
    const baseVF =
      "scale=1080:1920:force_original_aspect_ratio=decrease," +
      "pad=1080:1920:(1080-iw)/2:(1920-ih)/2,setsar=1";

    const label = `Parte ${i + 1}`;
    const draw = font
      ? `,drawtext=fontfile='${escapeForDrawtext(font)}':text='${label}':` +
        `x=(w-text_w)/2:y=60:fontsize=64:fontcolor=white:` +
        `box=1:boxcolor=black@0.55:boxborderw=12:shadowcolor=black:shadowx=2:shadowy=2`
      : "";

    const vf = baseVF + draw;

    const args = [
      "-y",
      "-i",
      src, // <- primero entrada
      "-ss",
      String(start), // <- seek preciso DESPUES de -i
      "-t",
      String(dur),
      "-vf",
      vf,
      "-map",
      "0:v:0?",
      "-map",
      "0:a:0?",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-shortest",
      "-movflags",
      "+faststart",
      out,
    ];

    await runFFmpeg(args);

    // Validación anti-clip vacío
    const stat = fs.statSync(out);
    if (stat.size < 2000) {
      throw new Error(
        `Empty/invalid clip generated: ${out} (start=${start}s, dur=${dur}s)`
      );
    }

    clips.push(out);
  }
  return clips;
}

export async function addSubtitles(
  video: string,
  srtPath: string
): Promise<string> {
  const src = resolveMediaPath(video);
  const srt = resolveMediaPath(srtPath);
  const out = path.resolve(`subtitled_${path.basename(video)}`);
  await runFFmpeg([
    "-y",
    "-i",
    src,
    "-vf",
    `subtitles=${srt.replace(/\\/g, "\\\\")}`,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "copy",
    out,
  ]);
  return out;
}
