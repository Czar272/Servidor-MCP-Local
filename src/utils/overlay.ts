import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

export async function addOverlay(
  video: string,
  overlay: string
): Promise<string> {
  const out = `overlay_${video}`;
  await execAsync(
    `ffmpeg -i ${video} -i ${overlay} -filter_complex "[1:v]scale=1080:640[ov];[0:v][ov]overlay=0:H-h" -c:a copy ${out}`
  );
  return out;
}
