import fs from "node:fs";
import path from "node:path";

export function logJsonl(file: string, obj: Object) {
  const p = path.resolve("logs", file);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.appendFileSync(
    p,
    JSON.stringify({ ts: new Date().toISOString(), ...obj }) + "\n"
  );
}
