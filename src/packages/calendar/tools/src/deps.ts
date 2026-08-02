import type { CalendarStorage } from "@dav-worker/calendar-contracts";
import type { CalendarConfig } from "./calendars";

// Platform-agnostic by design (SPEC-MONOREPO.md A.5): no Env, no KV,
// nothing Cloudflare-specific — this is what lets app/local exist.
export interface CalendarToolsDeps {
  storage: CalendarStorage;
  // Resolved once per request by the platform, not re-fetched per call.
  config: CalendarConfig;
}
