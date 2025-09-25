import path from "node:path";
import fs from "node:fs";

export function resolveMediaPath(p: string): string {
  const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  if (!fs.existsSync(abs)) throw new Error(`Path not found: ${abs}`);
  return abs;
}
