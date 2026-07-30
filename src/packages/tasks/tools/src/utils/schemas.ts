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
//
// task_create's shape: string only (no unlink concept — nothing to
// unlink on a brand-new task). task_update reuses the base string schema
// via UpdateEventIdSchema below, adding the "unlink" literal.
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

// task_update's variant of EventIdSchema: previously there was no way to
// remove an existing event_id link short of delete-and-recreate under a
// new UID, and the fix for that (a separate `unlink_event` boolean) had
// its own problem — it could be passed alongside a real `event_id` in the
// same call, an ambiguous combination that had to be resolved by fiat
// ("event_id wins"). Folding "unlink" into this field's own value space
// makes that combination impossible to express instead of merely resolved.
export const UpdateEventIdSchema = z
  .union([z.string(), z.literal("unlink")])
  .optional()
  .describe(
    "Id of an external event to link this task to (its start becomes this " +
      "task's DUE, one-shot copy, and a RELATED-TO is written), or the " +
      "literal string 'unlink' to remove an existing link and clear the " +
      "due date. Omit to leave any existing link/due date untouched.",
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

// task_update's new-value field, separate from StatusSchema above (that
// one is task_list's *filter* enum, which needs three coarse buckets —
// "in progress" isn't given percent granularity there because nobody
// filters for an exact percent). This one is a single field rather than
// separate `cancelled`/`progress` fields: those two were genuinely
// mutually exclusive in practice (progress is never touched once a task
// is cancelled), so having them as separate params meant an ambiguous
// combination (both passed at once) had to be resolved by fiat instead of
// simply being inexpressible.
export const UpdateProgressSchema = z
  .union([z.number().min(0).max(100), z.literal("cancelled")])
  .optional()
  .describe(
    "Either a completion percentage (0-100, maps to PERCENT-COMPLETE; " +
      "reaching 100 also marks STATUS as COMPLETED), or the literal string " +
      "'cancelled' to mark the task cancelled. Omit to leave unchanged.",
  );

export const PrioritySchema = z
  .number()
  .int()
  .min(0)
  .max(9)
  .optional()
  .describe(
    "Priority 0-9 per RFC 5545 (0 = undefined/none, 1 = highest, 9 = lowest). " +
      "Omit to leave unchanged.",
  );

export const TagsSchema = z
  .array(z.string())
  .optional()
  .describe(
    "Tags to add or remove from CATEGORIES, merged against the task's " +
      "existing tags. A plain string adds it (if not already present); a " +
      "string prefixed with '-' removes it (e.g. '-urgent'). Omit to leave " +
      "tags unchanged.",
  );

export const UrlSchema = z
  .string()
  .optional()
  .describe(
    "Sets the task's URL (RFC 5545 URL property) — e.g. a link to a " +
      "Nextcloud Notes entry. Pass an empty string to clear it. Omit to " +
      "leave unchanged.",
  );
