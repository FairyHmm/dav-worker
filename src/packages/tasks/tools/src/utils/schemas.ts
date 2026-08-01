import { z } from "zod";

// No config-based collectionSchema anymore — `list` is a free-form slug
// (SPEC-TASKS.md), discovered via list_all, not looked up in a category map.
export const ListSchema = z
  .string()
  .describe("Which task list this belongs to.");

export const ListNameSchema = z.string().describe("The list's display name.");

// Plain z.string() rather than a z.enum() of known categories — the valid
// set is per-session config (calendars.csv), not knowable when this
// schema is defined. list_create validates the value against the
// caller's actual configured categories at request time instead.
export const ListCategorySchema = z
  .string()
  .optional()
  .describe(
    "Category to file this list under, e.g. 'work' or 'school'. Omit to leave the list uncategorized.",
  );

export const TaskTitleSchema = z.string().describe("The task's title.");

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
    "An event to attach this task to, giving it a due date matching that event's start. " +
      "Omit to leave the task standalone and undated.",
  );

export const TaskIdSchema = z.string().describe("Which task to act on.");

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
    "Attach this task to an event (giving it a due date matching that event's start), " +
      "or pass 'unlink' to remove any existing attachment and clear the due date. " +
      "Omit to leave the task's current attachment and due date as is.",
  );

export const DueFilterSchema = z
  .union([
    z.object({ from: z.number(), to: z.number() }),
    z.object({ from: z.string(), to: z.string() }),
    z.enum(["today", "week", "month"]),
  ])
  .optional()
  .describe(
    "Restrict results to a due-date range: a day-offset window from today (0 = today), " +
      "an absolute 'YYYY-MM-DD' window, or a preset of 'today' | 'week' | 'month'. " +
      "Omit to include tasks regardless of due date.",
  );

export const StatusSchema = z
  .enum(["progress", "completed", "cancelled"])
  .optional()
  .describe(
    "Restrict results to tasks in this state: 'progress' covers anything not yet " +
      "finished or cancelled. Omit to include tasks in every state.",
  );

export const SortSchema = z
  .enum(["due", "completion"])
  .optional()
  .describe(
    "How to order results: by due date (earliest first) or by completion percentage " +
      "(least complete first). Omit to leave results in their stored order.",
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
    "Update the task's progress: a percentage from 0-100 (100 marks it complete), " +
      "or 'cancelled' to mark it cancelled. Omit to leave progress unchanged.",
  );

export const PrioritySchema = z
  .number()
  .int()
  .min(0)
  .max(9)
  .optional()
  .describe(
    "The task's priority, from 1 (highest) to 9 (lowest); 0 means no priority set. " +
      "Omit to leave unchanged.",
  );

export const TagsSchema = z
  .array(z.string())
  .optional()
  .describe(
    "Tags to add or remove. A plain string adds a tag; a string prefixed with '-' " +
      "removes it, e.g. '-urgent'. Omit to leave the task's tags unchanged.",
  );

export const UrlSchema = z
  .string()
  .optional()
  .describe(
    "A link to associate with the task, e.g. a related note. Pass an empty string " +
      "to remove it. Omit to leave unchanged.",
  );
