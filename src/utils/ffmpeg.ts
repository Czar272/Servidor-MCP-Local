import ffmpegPath from "ffmpeg-static";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function cutClips(
  video: string,
  count: number,
  minSec: number,
  maxSec: number
): Promise<string[]> {
  const clips: string[] = [];
  for (let i = 0; i < count; i++) {
    const out = `clip_${i}.mp4`;

    await execFileAsync(ffmpegPath as string, [
      "-i",
      video,
      "-ss",
      String(i * 60),
      "-t",
      String(minSec),
      "-vf",
      "scale=1080:1920",
      out,
    ]);

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
