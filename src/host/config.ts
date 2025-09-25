export type ServerSpec = { cmd: string; args: string[] };

export const servers: {
  local: ServerSpec;
  fs: ServerSpec | null;
  git: ServerSpec | null;
} = {
  local: { cmd: "node", args: ["dist/index.js"] },

  fs: process.env.MCP_FS_CMD
    ? {
        cmd: process.env.MCP_FS_CMD!,
        args: (process.env.MCP_FS_ARGS ?? "").split(" ").filter(Boolean),
      }
    : null,
  git: process.env.MCP_GIT_CMD
    ? {
        cmd: process.env.MCP_GIT_CMD!,
        args: (process.env.MCP_GIT_ARGS ?? "").split(" ").filter(Boolean),
      }
    : null,
};
