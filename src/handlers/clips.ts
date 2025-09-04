import { cutClips } from "../utils/ffmpeg.js";
import { addOverlay } from "../utils/overlay.js";

export async function handleClips(params: {
  video: string;
  transcript: string;
  count: number;
  minSec: number;
  maxSec: number;
  withGameplay?: boolean;
}) {
  const clips = await cutClips(
    params.video,
    params.count,
    params.minSec,
    params.maxSec
  );

  if (params.withGameplay) {
    for (let i = 0; i < clips.length; i++) {
      clips[i] = await addOverlay(clips[i], "gameplay.mp4");
    }
  }

  return { clips };
}
