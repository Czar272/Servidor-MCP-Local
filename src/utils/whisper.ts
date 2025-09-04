import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

export async function transcribeAudio(file: string): Promise<string> {
  const out = "transcript.txt";
  await execAsync(`whisper.cpp -f ${file} -o ${out}`);
  return out; // contenido de transcript
}
