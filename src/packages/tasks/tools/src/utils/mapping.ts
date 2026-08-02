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

// Maps request/response field names onto RFC 5545 VTODO properties via
// calendar-ical's generic get/set helpers.

// Collapses CalDAV's four STATUS values into three, for task_list
// filtering only — task_update's write side treats cancelled/progress
// as independent axes instead (see writeProgress below).
export type TaskStatus = "progress" | "completed" | "cancelled";

export function readStatus(todo: ICalComponent): TaskStatus | undefined {
  const raw = getText(todo, "STATUS");
  if (raw === "NEEDS-ACTION" || raw === "IN-PROCESS") return "progress";
  if (raw === "COMPLETED") return "completed";
  if (raw === "CANCELLED") return "cancelled";
  return undefined;
}

// Single value, not two params — progress/cancelled are mutually
// exclusive in practice. Reaching 100 sets STATUS=COMPLETED as a
// consequence, not a separately-passed state.
export function writeProgress(
  todo: ICalComponent,
  progress: number | "cancelled",
): void {
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

// Removals before additions, so "-x", "x" in one call nets to "x" present.
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

// `due` is set separately by the handler via resolveEventDue — no
// direct `due` input exists (SPEC-TASKS.md).
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

// Clears DUE too — its only source is a linked event, so an unlinked
// task has no principled DUE value to keep.
export function unlinkTaskFromEvent(todo: ICalComponent): void {
  removeProperty(todo, "RELATED-TO");
  removeProperty(todo, "DUE");
}

// Fails closed: an unresolvable event link doesn't silently downgrade
// to a standalone task (SPEC-TASKS.md).
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

// `eventId` re-linking stays in task_update — needs resolveEventDue,
// a storage-adjacent concern this pure mapper shouldn't own.
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

// Maps, not assumes-one — RFC 5545 doesn't forbid multiple VTODOs per resource.
export function extractTaskSummaries(ics: string | null): TaskSummary[] {
  if (!ics) return [];
  const cal = parseCalendar(ics);
  return findAllComponents(cal, "VTODO").map(summarizeVtodo);
}
