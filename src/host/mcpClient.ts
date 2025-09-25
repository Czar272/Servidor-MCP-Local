import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";
import { logJsonl } from "./logger.js";

export type JsonRpcMsg = {
  jsonrpc: "2.0";
  id?: number;
  method?: string;
  params?: any;
  result?: any;
  error?: { code: number; message: string; data?: any };
};

type Sendable = Omit<JsonRpcMsg, "jsonrpc" | "id">;

export class MCPClient {
  private proc!: ChildProcessWithoutNullStreams;
  private buf = "";
  private seq = 0;
  private pending = new Map<number, (msg: JsonRpcMsg) => void>();
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
    let i: number;
    while ((i = this.buf.indexOf("\n")) >= 0) {
      const line = this.buf.slice(0, i).trim();
      this.buf = this.buf.slice(i + 1);
      if (!line) continue;
      let msg: JsonRpcMsg;
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }
      logJsonl(`${this.name}.rx.jsonl`, msg);
      if (typeof msg.id === "number" && this.pending.has(msg.id)) {
        const r = this.pending.get(msg.id)!;
        this.pending.delete(msg.id);
        r(msg);
      }
    }
  }

  private send(msg: Sendable): Promise<JsonRpcMsg> {
    const id = ++this.seq;
    const full: JsonRpcMsg = { jsonrpc: "2.0", id, ...msg };
    logJsonl(`${this.name}.tx.jsonl`, full);
    this.proc.stdin.write(JSON.stringify(full) + "\n");
    return new Promise((res) => this.pending.set(id, res));
  }

  private notify(method: string, params?: any) {
    const notif = { jsonrpc: "2.0" as const, method, params };
    logJsonl(`${this.name}.tx.jsonl`, notif);
    this.proc.stdin.write(JSON.stringify(notif) + "\n");
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

  async listTools(): Promise<{ name: string; description?: string }[]> {
    const res = await this.send({ method: "tools/list" });
    if (res.error) throw new Error(res.error.message);
    return res.result?.tools ?? [];
  }

  async callTool(name: string, args: any) {
    const res = await this.send({
      method: "tools/call",
      params: { name, arguments: args },
    });
    return res;
  }

  async callToolSafe(name: string, args: any): Promise<string> {
    const res = await this.callTool(name, args);
    if (res.error) throw new Error(res.error.message);
    const c0 = res.result?.content?.[0];
    const txt =
      typeof c0?.text === "string" ? c0.text : JSON.stringify(res.result ?? {});
    return txt;
  }

  async stop() {
    try {
      this.proc.stdin.end();
      this.proc.kill();
    } catch {}
  }
}
