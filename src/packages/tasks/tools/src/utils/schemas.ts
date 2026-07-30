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
