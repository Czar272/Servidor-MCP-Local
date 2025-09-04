import { addSubtitles } from "../utils/ffmpeg.js";

export async function handleSubtitles(params: {
  video: string;
  transcript: string;
}) {
  const output = await addSubtitles(params.video, params.transcript);
  return { video: output };
}
