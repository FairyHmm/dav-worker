// Storage contract for task tools. Independent of CalendarStorage — tasks
// don't require CalDAV. CalDAV VTODO is just today's implementation.

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

  // Optional hex color (e.g. "#3B82F6"), resolved from calendar category upstream.
  listCreate(name: string, color?: string): Promise<void>;

  listDelete(slug: string): Promise<void>;

  // Color is the list's own calendar-color prop (null if never set).
  listAll(): Promise<
    { slug: string; displayName: string; color: string | null }[]
  >;
}
