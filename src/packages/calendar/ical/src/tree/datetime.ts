// No timezone conversion — the Worker deliberately doesn't carry an IANA tz
// database. Callers must supply zone-local ISO strings when TZID is present.
export function isoToBasic(iso: string): string {
  const datePart = iso.slice(0, 10).replace(/-/g, "");
  if (iso.length <= 10) return datePart;

  const rest = iso.slice(11);
  const utc = rest.endsWith("Z");
  const timePart = (utc ? rest.slice(0, -1) : rest)
    .replace(/\.\d+$/, "")
    .replace(/:/g, "");
  return `${datePart}T${timePart}${utc ? "Z" : ""}`;
}

// Keeps the caller-facing interface consistently ISO end-to-end, even though
// the wire format is RFC 5545 basic.
export function basicToIso(basic: string): string {
  const datePart = `${basic.slice(0, 4)}-${basic.slice(4, 6)}-${basic.slice(6, 8)}`;
  if (basic.length <= 8) return datePart;

  const timeRaw = basic.slice(9);
  const utc = timeRaw.endsWith("Z");
  const t = utc ? timeRaw.slice(0, -1) : timeRaw;
  const timePart = `${t.slice(0, 2)}:${t.slice(2, 4)}:${t.slice(4, 6)}`;
  return `${datePart}T${timePart}${utc ? "Z" : ""}`;
}

// For DTSTAMP/CREATED/LAST-MODIFIED — always UTC.
export function nowStamp(): string {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z");
}
