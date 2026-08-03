// SPEC-TASKS.md's name->slug transform, e.g. "Personal Tasks!" -> "personal-tasks".
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
