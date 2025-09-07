import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath as string, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    p.stderr.on("data", (d) => (stderr += d.toString()));
    p.on("close", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`ffmpeg exited ${code}\n${stderr}`));
    });
  });
}

export async function cutClips(
  video: string,
  count: number,
  minSec: number,
  maxSec: number
): Promise<string[]> {
  const src = path.resolve(video);
  if (!fs.existsSync(src)) throw new Error(`Video not found: ${src}`);

  const clips: string[] = [];

  // Tomamos minSec como duración objetivo (puedes cambiar a un random entre min/max)
  const dur = Math.max(1, Math.min(maxSec, minSec));

  for (let i = 0; i < count; i++) {
    const start = i * (dur + 1); // pequeño gap de 1s para evitar borde de GOP
    const out = path.resolve(`clip_${i}.mp4`);

    // Escalar a 9:16 conservando aspecto y pad centrado + SAR=1
    const vf =
      "scale=1080:1920:force_original_aspect_ratio=decrease," +
      "pad=1080:1920:(1080-iw)/2:(1920-ih)/2,setsar=1";

    const args = [
      "-y",
      "-i",
      src, // <- primero entrada
      "-ss",
      String(start), // <- seek preciso DESPUÉS de -i
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

    // Verificación: si quedó vacío, lanza error para verlo en tu cliente
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
  transcript: string
): Promise<string> {
  const out = `subtitled_${video}`;
  await execFileAsync(ffmpegPath as string, [
    "-i",
    video,
    "-vf",
    `subtitles=${transcript}`,
    out,
  ]);
  return out;
}
