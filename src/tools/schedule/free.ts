import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { err } from "../../utils.js";
import { z } from "zod";
import { CategorySchema, TimeWindowSchema } from "./utils/schemas.js";

// Stub: registered now so the tool's shape is stable once implemented, but
// the body is deliberately unimplemented. Availability requires inverting a
// listByTimeRange() result set against the requested window to find gaps —
// real logic, not a REPORT one-liner — and is its own unit per TODO.md.
export function registerScheduleFreeTool(server: McpServer, env: Env): void {
  server.registerTool(
    "nc_schedule_free",
    {
      description:
        "Find available time slots of at least `duration` within a window. " +
        "NOT YET IMPLEMENTED.",
      inputSchema: {
        duration: z.string().describe("Minimum slot length, e.g. '1h', '30m'."),
        between: TimeWindowSchema,
        category: CategorySchema.optional(),
      },
    },
    async () => {
      return err(new Error("nc_schedule_free is not implemented yet."));
    },
  );
}
