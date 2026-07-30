import type { ICalComponent } from "@dav-worker/calendar-ical";
import {
  parseCalendar,
  newTodo,
  getText,
  setText,
  removeProperty,
  getDateTime,
  setDateTime,
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
// into three (SPEC-TASKS.md): NEEDS-ACTION/IN-PROCESS both read as
// "progress" (an unset PERCENT-COMPLETE is just the start of "in
// progress" — no meaningful frontend distinction). Write side is
// one-directional: "progress" always writes IN-PROCESS, never
// NEEDS-ACTION — that only ever arises as a VTODO's initial unset state.
export type TaskStatus = "progress" | "completed" | "cancelled";

export function readStatus(todo: ICalComponent): TaskStatus | undefined {
  const raw = getText(todo, "STATUS");
  if (raw === "NEEDS-ACTION" || raw === "IN-PROCESS") return "progress";
  if (raw === "COMPLETED") return "completed";
  if (raw === "CANCELLED") return "cancelled";
  return undefined;
}

export function writeStatus(todo: ICalComponent, status: TaskStatus): void {
  if (status === "progress") {
    setText(todo, "STATUS", "IN-PROCESS");
  } else if (status === "completed") {
    setText(todo, "STATUS", "COMPLETED");
    setText(todo, "PERCENT-COMPLETE", "100");
  } else {
    setText(todo, "STATUS", "CANCELLED");
  }
}

export interface TaskFields {
  title?: string;
  eventId?: string;
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
  fields: { title?: string; status?: TaskStatus },
): void {
  if (fields.title !== undefined) setText(todo, "SUMMARY", fields.title);
  if (fields.status !== undefined) writeStatus(todo, fields.status);

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
}

function summarizeVtodo(vtodo: ICalComponent): TaskSummary {
  const due = getDateTime(vtodo, "DUE");
  const percentRaw = getText(vtodo, "PERCENT-COMPLETE");
  return {
    uid: getText(vtodo, "UID") ?? "",
    title: getText(vtodo, "SUMMARY") ?? "",
    due: due ? basicToIso(due.raw) : undefined,
    eventId: getText(vtodo, "RELATED-TO"),
    status: readStatus(vtodo),
    percentComplete: percentRaw ? Number(percentRaw) : undefined,
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
