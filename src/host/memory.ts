export type Turn = { role: "user" | "assistant"; text: string };
export type Memory = { turns: Turn[]; summary?: string };

export class ConversationMemory {
  private maxTurns: number;
  data: Memory = { turns: [] };

  constructor(maxTurns = 12) {
    this.maxTurns = maxTurns;
  }

  push(role: Turn["role"], text: string) {
    this.data.turns.push({ role, text });
    if (this.data.turns.length > this.maxTurns) this.data.turns.shift();
  }

  latest(n = 6) {
    return this.data.turns.slice(-n);
  }
}
