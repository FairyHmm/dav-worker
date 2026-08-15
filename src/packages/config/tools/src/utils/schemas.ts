import { z } from "zod";

export const SectionSchema = z
  .enum(["preferences", "locations", "calendars", "disabled"])
  .describe("Which top-level config.toml section to target.");

export const ValueSchema = z
  .record(z.string(), z.unknown())
  .describe(
    "The section's full replacement value — wholesale replace, not a merge. ",
  );
