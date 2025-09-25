import { MCPClient } from "./mcpClient.js";

export type ClientMap = {
  local: MCPClient;
  fs?: MCPClient | null;
  git?: MCPClient | null;
};

export async function routeCall(
  clients: ClientMap,
  tool: string,
  args: any,
  target?: "local" | "fs" | "git"
) {
  const server = target ?? "local";
  const client =
    server === "local"
      ? clients.local
      : server === "fs"
      ? clients.fs
      : server === "git"
      ? clients.git
      : null;

  if (!client) throw new Error(`Server '${server}' not available`);
  return client.callToolSafe(tool, args);
}
