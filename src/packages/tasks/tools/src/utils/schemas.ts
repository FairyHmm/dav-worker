import { z } from "zod";

// Free-form slug (SPEC-TASKS.md) — no category-map lookup.
export const ListSchema = z
  .string()
  .describe("Which task list this belongs to.");

// list_delete: acted-on, not "belongs to" — separate wording from ListSchema.
export const ListTargetSchema = z
  .string()
  .describe("Which task list to delete.");

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

// No direct `due` input — always derived from the linked event
// (SPEC-TASKS.md). task_update adds "unlink" via UpdateEventIdSchema below.
export const EventIdSchema = z
  .string()
  .optional()
  .describe(
    "An event to attach this task to, giving it a due date matching that event's start. " +
      "Omit to leave the task standalone and undated.",
  );

export const TaskIdSchema = z.string().describe("Which task to act on.");

// "unlink" folded into the value itself, not a separate boolean — makes
// "both event_id and unlink passed" inexpressible rather than resolved by fiat.
export const UpdateEventIdSchema = z
  .union([z.string(), z.literal("unlink")])
  .optional()
  .describe(
    "An event to attach this task to, giving it a due date matching that event's start, " +
      "or 'unlink' to remove any existing attachment and clear the due date. Omit to leave as is.",
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

// Single field, not separate cancelled/progress params — those are
// mutually exclusive in practice, so this makes the ambiguous "both passed"
// case inexpressible rather than resolved by fiat.
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

export const TagsFilterSchema = z
  .array(z.string())
  .optional()
  .describe(
    "Restrict results by tag. A plain string requires at least one match; a string " +
      "prefixed with '-' excludes any task carrying it, e.g. '-urgent'. Omit to include " +
      "tasks regardless of tags.",
  );
