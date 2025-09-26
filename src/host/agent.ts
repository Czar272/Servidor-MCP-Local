import { MCPClient } from "./mcpClient.js";
import { askLLM } from "./llm.js";
import { logJsonl } from "./logger.js";

type ToolSpec = { name: string; description?: string; inputSchema?: any };
type PlanStep = {
  server: "fs" | "git";
  tool: string;
  args: Record<string, any>;
  note?: string;
};

type Plan = {
  objective: string;
  steps: PlanStep[];
};

export async function runAgentRepoWorkflow(
  fsClient: MCPClient | null,
  gitClient: MCPClient | null,
  instruction: string
) {
  if (!fsClient || !gitClient) {
    throw new Error("FS/Git servers are required for the agent.");
  }

  const [fsTools, gitTools] = await Promise.all([
    fsClient.listTools(),
    gitClient.listTools(),
  ]);

  // contexto para el LLM
  const sys = `You are a tool-use planner.
Output ONLY a JSON object. No fences.

Schema: { "objective": string, "steps": Step[] }
Step: { "server": "fs" | "git", "tool": string, "args": object }

Hard constraints:
- First create the directory for the repository with fs.create_directory.
- For ALL git tools, use the absolute or repo-relative path of the repository folder (e.g. "repo-by-agent"), NEVER ".".
- Prefer git_set_working_dir to that same folder BEFORE other git operations.
- Then call git_init with "path":"repo-by-agent" (not ".").
- Write README into "repo-by-agent/README.md", then add/commit referencing that path.
- Use ONLY the tools listed by the client.`;

  const toolsBrief = (label: string, tools: ToolSpec[]) =>
    `${label} tools:\n` +
    tools
      .map((t) => `- ${t.name}${t.description ? `: ${t.description}` : ""}`)
      .join("\n");

  const user = `Objective: ${instruction}

${toolsBrief("FS", fsTools)}
${toolsBrief("GIT", gitTools)}

Return ONLY the JSON.`;

  // produce plan
  const planText = await askLLM(sys, user, { maxTokens: 500 });
  logJsonl("agent.plan.jsonl", { planText });

  let plan: Plan;
  try {
    plan = JSON.parse(planText);
  } catch (e) {
    throw new Error("Planner did not return valid JSON plan: " + e);
  }

  // Ejecutar plan
  const outputs: any[] = [];
  for (let i = 0; i < plan.steps.length; i++) {
    const s = plan.steps[i];
    const client = s.server === "fs" ? fsClient : gitClient;
    logJsonl("agent.exec.jsonl", { step: i + 1, s });

    try {
      const res = await client.callTool(s.tool, s.args);
      outputs.push({ step: i + 1, ok: true, res });
    } catch (err: any) {
      outputs.push({ step: i + 1, ok: false, error: String(err) });
      break;
    }
  }

  return { objective: plan.objective, steps: plan.steps, outputs };
}
