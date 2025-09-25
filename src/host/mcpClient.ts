import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";
import { logJsonl } from "./logger.js";

type Msg = {
  jsonrpc: "2.0";
  id?: number;
  method?: string;
  params?: any;
  result?: any;
  error?: any;
};

export class MCPClient {
  private proc!: ChildProcessWithoutNullStreams;
  private buf = "";
  private id = 0;
  private pending = new Map<number, (msg: Msg) => void>();
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  async start(cmd: string, args: string[] = []) {
    this.proc = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"] });
    this.proc.stderr.on("data", (d) =>
      logJsonl(`${this.name}.stderr.jsonl`, { line: d.toString() })
    );
    this.proc.stdout.on("data", (chunk) => this.onData(chunk.toString("utf8")));
    await this.initialize();
  }

  private onData(str: string) {
    this.buf += str;
    let i;
    while ((i = this.buf.indexOf("\n")) >= 0) {
      const line = this.buf.slice(0, i).trim();
      this.buf = this.buf.slice(i + 1);
      if (!line) continue;
      let msg: Msg;
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }
      logJsonl(`${this.name}.rx.jsonl`, msg);
      if (msg.id && this.pending.has(msg.id)) {
        const r = this.pending.get(msg.id)!;
        this.pending.delete(msg.id);
        r(msg);
      }
    }
  }

  private send(msg: Omit<Msg, "jsonrpc" | "id">): Promise<Msg> {
    const id = ++this.id;
    // quitamos por si acaso propiedades que no queremos pisar
    const {
      /* @ts-ignore */ jsonrpc: _jr,
      /* @ts-ignore */ id: _id,
      ...rest
    } = msg as any;
    const full: Msg = { jsonrpc: "2.0", id, ...rest };
    logJsonl(`${this.name}.tx.jsonl`, full);
    this.proc.stdin.write(JSON.stringify(full) + "\n");
    return new Promise((res) => this.pending.set(id, res));
  }

  private notify(method: string, params?: any) {
    const m = { jsonrpc: "2.0" as const, method, params };
    logJsonl(`${this.name}.tx.jsonl`, m);
    this.proc.stdin.write(JSON.stringify(m) + "\n");
  }

  async initialize() {
    const init = await this.send({
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "host-cli", version: "0.1.0" },
      },
    });
    this.notify("initialized");
    return init;
  }

  async listTools() {
    const res = await this.send({ method: "tools/list" });
    return res.result?.tools ?? [];
  }

  async callTool(name: string, args: any) {
    const res = await this.send({
      method: "tools/call",
      params: { name, arguments: args },
    });
    return res;
  }

  async stop() {
    try {
      this.proc.stdin.end();
      this.proc.kill();
    } catch {}
  }
}
