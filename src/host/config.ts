export const servers = {
  // Tu servidor local (ya compilado en dist/index.js)
  local: { cmd: "node", args: ["dist/index.js"] },

  // Opcionales: si los tienes disponibles
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
