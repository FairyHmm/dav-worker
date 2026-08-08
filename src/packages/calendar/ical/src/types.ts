export interface ICalProperty {
  value: string;
  params: Record<string, string>;
}

// Properties map to arrays because one name can appear multiple times
// (e.g. multiple ATTENDEE lines per RFC 5545).
export interface ICalComponent {
  name: string;
  properties: Record<string, ICalProperty[]>;
  components: ICalComponent[];
}

export interface ICalDateTime {
  raw: string;
  isDate: boolean;
  tzid?: string;
}

// RRULE is semicolon-separated KEY=VALUE, not plain TEXT — so it gets
// its own type rather than reusing string.
export interface ICalRecurrence {
  freq: string;
  interval?: number;
  until?: string;
  count?: number;
  byday?: string[];
  extra?: Record<string, string>;
}
