import { NextcloudBase } from "../base.js";
import { calendarPath } from "./url.js";
import { lookupByUid } from "./uid-lookup.js";
import type { ComponentType, ReportEntry } from "./report.js";

// Scaffold: generic REPORT plumbing + UID lookup, shared by the Schedule and
// Tasks tool layers. `list`/`create`/`update`/`delete`/`free` (per SPEC.md's
// architecture diagram) are deliberately NOT implemented yet — TODO.md calls
// for settling the CalDAV status-code contract in SPEC-SCHEDULES.md /
// SPEC-TASKS.md (SPEC.md risk #7: missing UID, ETag mismatch on update, etc.)
// before those are written, so they aren't retrofitted per-tool the way
// Files' error handling was.
export class CalDAVClient extends NextcloudBase {
  private path(calendarName: string): string {
    return calendarPath(this.caldavBasePath(), calendarName);
  }

  async findByUid(
    calendarName: string,
    componentType: ComponentType,
    uid: string,
  ): Promise<ReportEntry | null> {
    return lookupByUid(this, this.path(calendarName), componentType, uid);
  }
}
