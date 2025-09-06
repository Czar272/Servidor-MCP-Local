import ffmpegPath from "ffmpeg-static";
import { execFile } from "node:child_process";

execFile(ffmpegPath as string, ["-version"], (err, stdout, stderr) => {
  if (err) {
    console.error("FFmpeg error:", err);
    return;
  }
  console.log("FFmpeg version:");
  console.log(stdout || stderr);
});
