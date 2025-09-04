import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

export async function cutClips(
  video: string,
  count: number,
  minSec: number,
  maxSec: number
): Promise<string[]> {
  // Aquí usarías lógica para elegir segmentos (mock por ahora)
  const clips: string[] = [];
  for (let i = 0; i < count; i++) {
    const out = `clip_${i}.mp4`;
    await execAsync(
      `ffmpeg -i ${video} -ss ${
        i * 60
      } -t ${minSec} -vf "scale=1080:1920" ${out}`
    );
    clips.push(out);
  }
  return clips;
}

export async function addSubtitles(
  video: string,
  transcript: string
): Promise<string> {
  const srtFile = "subs.srt";
  // Guardar transcript en formato SRT...
  const out = `subtitled_${video}`;
  await execAsync(`ffmpeg -i ${video} -vf subtitles=${srtFile} ${out}`);
  return out;
}
