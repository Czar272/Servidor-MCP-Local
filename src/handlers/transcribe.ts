import { transcribeAudio } from "../utils/whisper.js";

export async function handleTranscribe(params: { file: string }) {
  const transcript = await transcribeAudio(params.file);
  return { transcript };
}
