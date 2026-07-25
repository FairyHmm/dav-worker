import type { CalendarStorage } from "@dav-worker/calendar-contracts";
import type { CalendarConfig } from "./calendars.js";

// What a platform (app/worker, app/local) must supply to
// registerCalendarTools — a conforming CalendarStorage implementation, the
// session's resolved CalendarConfig (TODO-MONOREPO 9e — fetched once per
// request by the platform, not re-fetched per tool call), and nothing else
// platform-specific (no Env, no KV, no Cloudflare bindings). Per
// SPEC-MONOREPO.md A.5: this is what makes app/local possible without
// touching calendar/tools itself.
export interface CalendarToolsDeps {
  storage: CalendarStorage;
  config: CalendarConfig;
}
