import { z } from "zod";

// "stop" is opt-in — only the caller knows if their items have an
// ordering dependency that makes fail-fast the right call.
export const ErrorModeSchema = z
  .enum(["continue", "stop"])
  .default("continue")
  .optional();

export type ErrorMode = "continue" | "stop";
