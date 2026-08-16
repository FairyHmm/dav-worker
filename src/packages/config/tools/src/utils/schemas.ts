import { z } from "zod";
import { CONFIG_SECTIONS } from "@dav-worker/config-parser";

export const SectionSchema = z
  .enum(CONFIG_SECTIONS)
  .describe("Which top-level config.toml section to target.");

export const ValueSchema = z
  .record(z.string(), z.unknown())
  .describe(
    "The section's full replacement value — wholesale replace, not a merge. ",
  );
