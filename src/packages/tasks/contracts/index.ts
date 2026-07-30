// TaskStorage is the contract `tasks/tools/*` codes against. Deliberately
// independent of @dav-worker/calendar-contracts' CalendarStorage — tasks
// don't require CalDAV. A future non-CalDAV backend (a local Markdown
// store, Todoist, etc.) can implement this without any calendar concept
// ever entering the picture. Today's only implementation happens to speak
// CalDAV VTODO (storage/nextcloud), but that's an implementation detail,
// not something this interface should assume.
//
// Shape mirrors CalendarStorage's method names for familiarity, but drops
// anything CalDAV-specific: no `componentType` param (a TaskStorage only
// ever deals in tasks), no `findTravelBuffersFor` (calendar-only concept).

export interface TaskEntry {
  uid: string;
  ics: string | null;
}

export interface TaskStorage {
  findByUid(list: string, uid: string): Promise<TaskEntry | null>;

  list(list: string): Promise<TaskEntry[]>;

  create(list: string, uid: string, icsBody: string): Promise<void>;

  update(list: string, uid: string, icsBody: string): Promise<void>;

  delete(list: string, uid: string): Promise<void>;

  // List-management (task-list-as-CalDAV-collection lifecycle), added per
  // SPEC-TASKS.md — a task list is a dedicated VTODO-only collection,
  // distinct from a config-mapped category. `list` is a raw slug here too:
  // list_create/list_all are the only source of valid values, there's no
  // separate lists.toml.
  listCreate(name: string): Promise<void>;

  listDelete(slug: string): Promise<void>;

  listAll(): Promise<{ slug: string; displayName: string }[]>;
}
