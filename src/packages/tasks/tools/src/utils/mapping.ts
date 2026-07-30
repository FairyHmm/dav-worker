import type { ICalComponent } from "@dav-worker/calendar-ical";
import {
  parseCalendar,
  newTodo,
  getText,
  setText,
  removeProperty,
  getDateTime,
  setDateTime,
  getTextList,
  setTextList,
  nowStamp,
  findAllComponents,
  basicToIso,
} from "@dav-worker/calendar-ical";

// Maps dav-worker's own request/response field names onto RFC 5545 VTODO
// properties, via calendar-ical's generic get/set helpers. calendar-ical
// is the shared iCal parsing layer (protocol-level, not calendar-domain-
// specific) — tasks/tools depends on it directly, the same way
// calendar/tools does, without depending on calendar-contracts.

// Frontend-facing status name, collapsing CalDAV's four STATUS values
// into three (SPEC-TASKS.md, task_list's filter semantics): NEEDS-ACTION/
// IN-PROCESS both read as "progress" (an unset PERCENT-COMPLETE is just
// the start of "in progress" — no meaningful frontend distinction).
// Retained for task_list filtering only — task_update's *write* side no
// longer uses this 3-way enum (see writeCancelled/writeProgress below):
// cancelled and completion-percent are independent axes there, not a
// single tri-state.
export type TaskStatus = "progress" | "completed" | "cancelled";

export function readStatus(todo: ICalComponent): TaskStatus | undefined {
  const raw = getText(todo, "STATUS");
  if (raw === "NEEDS-ACTION" || raw === "IN-PROCESS") return "progress";
  if (raw === "COMPLETED") return "completed";
  if (raw === "CANCELLED") return "cancelled";
  return undefined;
}

// task_update's write-side replacement for the old 3-way writeStatus.
// Progress and cancellation are mutually exclusive in practice (progress
// is never touched once a task is cancelled), so this takes one value
// rather than two separate params — see UpdateProgressSchema. Reaching
// 100 still sets STATUS=COMPLETED as a natural consequence of "fully
// done", not a separately-passed state.
export function writeProgress(todo: ICalComponent, progress: number | "cancelled"): void {
  if (progress === "cancelled") {
    setText(todo, "STATUS", "CANCELLED");
    return;
  }
  setText(todo, "PERCENT-COMPLETE", String(progress));
  setText(todo, "STATUS", progress === 100 ? "COMPLETED" : "IN-PROCESS");
}

export function writePriority(todo: ICalComponent, priority: number): void {
  setText(todo, "PRIORITY", String(priority));
}

// Merges `tags` against the task's existing CATEGORIES: a plain string
// adds it (deduped), a "-"-prefixed string removes it. Order: removals
// then additions, so "-x", "x" in the same call nets to "x" present
// (add wins over remove when both target the same tag in one call).
export function applyTagChanges(todo: ICalComponent, tags: string[]): void {
  const current = new Set(getTextList(todo, "CATEGORIES"));
  for (const tag of tags) {
    if (tag.startsWith("-")) current.delete(tag.slice(1));
  }
  for (const tag of tags) {
    if (!tag.startsWith("-")) current.add(tag);
  }
  setTextList(todo, "CATEGORIES", [...current]);
}

export function writeUrl(todo: ICalComponent, url: string): void {
  if (url === "") {
    removeProperty(todo, "URL");
  } else {
    setText(todo, "URL", url);
  }
}

export interface TaskFields {
  title?: string;
  eventId?: string;
  progress?: number | "cancelled";
  priority?: number;
  tags?: string[];
  url?: string;
}

// `due` isn't part of TaskFields' direct input — it's set separately by
// the create/update tool handler after resolving it via resolveEventDue,
// never taken straight from the caller (SPEC-TASKS.md: no direct `due`
// input exists at all).
export function buildTaskComponent(
  uid: string,
  fields: Required<Pick<TaskFields, "title">>,
): ICalComponent {
  const todo = newTodo(uid);
  setText(todo, "SUMMARY", fields.title);
  return todo;
}

export function setTaskDue(todo: ICalComponent, due: string): void {
  setDateTime(todo, "DUE", due);
}

export function setTaskRelatedTo(todo: ICalComponent, eventId: string): void {
  setText(todo, "RELATED-TO", eventId);
}

// Beyond SPEC-TASKS.md's documented behavior: once a task is linked, there
// was previously no way to unlink it short of delete-and-recreate under a
// new UID (losing status/history). Clears RELATED-TO and DUE together —
// DUE's only source is a linked event (SPEC-TASKS.md: "no direct due
// input"), so a task with no link has no principled DUE value to keep
// either; leaving a stale DUE around after unlinking would misrepresent
// where that date came from.
export function unlinkTaskFromEvent(todo: ICalComponent): void {
  removeProperty(todo, "RELATED-TO");
  removeProperty(todo, "DUE");
}

// Shared by task_create/task_update: resolve an event_id via
// resolveEventDue and apply DUE + RELATED-TO to `todo`, or return a
// message describing why it failed (caller wraps that in err()). Fail
// closed either way — an explicit event link that can't be resolved
// shouldn't silently downgrade into a standalone task (SPEC-TASKS.md).
// `verb` only changes the wording ("no task created" vs "task not
// updated") between the two call sites.
export async function linkTaskToEvent(
  todo: ICalComponent,
  eventId: string,
  resolveEventDue: (eventId: string) => Promise<string | null>,
  verb: "created" | "updated",
): Promise<string | null> {
  const due = await resolveEventDue(eventId);
  if (due === null) {
    const outcome = verb === "created" ? "no task created" : "task not updated";
    return `Event "${eventId}" not found — ${outcome}.`;
  }
  setTaskDue(todo, due);
  setTaskRelatedTo(todo, eventId);
  return null;
}

// Applies only the fields present in `fields` (undefined = leave as-is),
// then bumps DTSTAMP/LAST-MODIFIED. `eventId` re-linking is handled by
// task_update directly (it needs to call resolveEventDue and replace
// RELATED-TO, both storage-adjacent concerns this pure mapper shouldn't own).
export function applyTaskFields(
  todo: ICalComponent,
  fields: {
    title?: string;
    progress?: number | "cancelled";
    priority?: number;
    tags?: string[];
    url?: string;
  },
): void {
  if (fields.title !== undefined) setText(todo, "SUMMARY", fields.title);
  if (fields.progress !== undefined) writeProgress(todo, fields.progress);
  if (fields.priority !== undefined) writePriority(todo, fields.priority);
  if (fields.tags !== undefined) applyTagChanges(todo, fields.tags);
  if (fields.url !== undefined) writeUrl(todo, fields.url);

  const stamp = nowStamp();
  todo.properties["DTSTAMP"] = [{ value: stamp, params: {} }];
  todo.properties["LAST-MODIFIED"] = [{ value: stamp, params: {} }];
}

export interface TaskSummary {
  uid: string;
  title: string;
  due?: string;
  eventId?: string;
  status?: TaskStatus;
  percentComplete?: number;
  priority?: number;
  tags?: string[];
  url?: string;
}

function summarizeVtodo(vtodo: ICalComponent): TaskSummary {
  const due = getDateTime(vtodo, "DUE");
  const percentRaw = getText(vtodo, "PERCENT-COMPLETE");
  const priorityRaw = getText(vtodo, "PRIORITY");
  const tags = getTextList(vtodo, "CATEGORIES");
  return {
    uid: getText(vtodo, "UID") ?? "",
    title: getText(vtodo, "SUMMARY") ?? "",
    due: due ? basicToIso(due.raw) : undefined,
    eventId: getText(vtodo, "RELATED-TO"),
    status: readStatus(vtodo),
    percentComplete: percentRaw ? Number(percentRaw) : undefined,
    priority: priorityRaw ? Number(priorityRaw) : undefined,
    tags: tags.length > 0 ? tags : undefined,
    url: getText(vtodo, "URL"),
  };
}

// A TaskEntry's ics can in principle hold more than one VTODO (RFC 5545
// doesn't forbid it), so this mirrors calendar/tools' extractEventSummaries
// shape rather than assuming exactly one.
export function extractTaskSummaries(ics: string | null): TaskSummary[] {
  if (!ics) return [];
  const cal = parseCalendar(ics);
  return findAllComponents(cal, "VTODO").map(summarizeVtodo);
}
