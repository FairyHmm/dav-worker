import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TaskToolsDeps } from "./src/deps.js";
import { registerTaskCreateTool } from "./src/task/create.js";
import { registerTaskListTool } from "./src/task/list.js";
import { registerListCreateTool } from "./src/list/create.js";

export type { TaskToolsDeps } from "./src/deps.js";

// Public entry point for this package, mirroring calendar/tools' shape
// (SPEC-MONOREPO.md A.5): takes only TaskToolsDeps (a TaskStorage
// implementation + resolveEventDue), never a platform type — so app/worker
// and app/local can both call this with their own conforming storage.
export function registerTaskTools(server: McpServer, deps: TaskToolsDeps): void {
  registerListCreateTool(server, deps);
  registerTaskCreateTool(server, deps);
  registerTaskListTool(server, deps);
}
