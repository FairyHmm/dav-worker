import type { CalendarStorage } from "@dav-worker/calendar-contracts";

// What a platform (app/worker, app/local) must supply to
// registerCalendarTools — a conforming CalendarStorage implementation and
// nothing platform-specific (no Env, no KV, no Cloudflare bindings). Per
// SPEC-MONOREPO.md A.5: this is what makes app/local possible without
// touching calendar/tools itself.
export interface CalendarToolsDeps {
  storage: CalendarStorage;
}
