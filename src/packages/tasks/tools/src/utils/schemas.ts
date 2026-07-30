import { z } from "zod";

// No config-based collectionSchema anymore — `list` is a free-form slug
// (SPEC-TASKS.md), discovered via list_all, not looked up in a category map.
export const ListSchema = z
  .string()
  .describe("Task list slug, as returned by list_all or list_create.");

export const ListNameSchema = z
  .string()
  .describe(
    "Task list display name. Slugified into a URL-safe collection segment " +
      "(lowercased, non-alphanumeric runs collapsed to '-', trimmed).",
  );

export const TaskTitleSchema = z.string().describe("Task title.");

// No direct `due` input (SPEC-TASKS.md) — a task's date always comes from
// its linked event via `event_id`. Genuinely undated, unlinked tasks
// belong in Markdown, not here.
export const EventIdSchema = z
  .string()
  .optional()
  .describe(
    "Optional id of an external event (e.g. a CalDAV event UID) to link this " +
      "task to. Its start becomes this task's DUE (one-shot copy, not live-" +
      "synced) and a RELATED-TO is written. Omit for a standalone, undated task.",
  );

export const TaskIdSchema = z
  .string()
  .describe("The task's id, as returned by task_list/task_create.");

// Beyond SPEC-TASKS.md's documented surface: previously there was no way
// to remove an existing event_id link short of delete-and-recreate under a
// new UID. `event_id` alone can only set/replace a link, never clear one
// (omitting it just leaves the existing link untouched) — this is the
// dedicated clear path, mutually exclusive with passing `event_id` in the
// same call.
export const UnlinkEventSchema = z
  .boolean()
  .optional()
  .describe(
    "If true, removes any existing event link (RELATED-TO) and clears the " +
      "task's due date, since due only ever comes from a linked event. " +
      "Ignored if `event_id` is also provided in the same call.",
  );

export const DueFilterSchema = z
  .union([
    z.object({ from: z.number(), to: z.number() }),
    z.object({ from: z.string(), to: z.string() }),
    z.enum(["today", "week", "month"]),
  ])
  .optional()
  .describe(
    "Filter by due date: { from, to } as relative day-offsets from today " +
      "(0 = today), { from, to } as absolute 'YYYY-MM-DD' dates, or a preset: " +
      "'today' | 'week' | 'month'. Omit for no due-date filtering.",
  );

export const StatusSchema = z
  .enum(["progress", "completed", "cancelled"])
  .optional()
  .describe(
    "Filter by status. 'progress' matches NEEDS-ACTION or IN-PROCESS (no " +
      "meaningful frontend distinction between them). Omit to return tasks " +
      "in all three states.",
  );

export const SortSchema = z
  .enum(["due", "completion"])
  .optional()
  .describe(
    "Sort order: 'due' (ascending, earliest first) or 'completion' " +
      "(PERCENT-COMPLETE, ascending). Omit for list-storage order.",
  );
