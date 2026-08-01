import { z } from "zod";

// Per SPEC-BATCH.md Appendix A: best-effort is the default. "stop" is an
// opt-in fail-fast mode for same-tool batches where items happen to have
// an ordering dependency (rare, but the caller knows their own data).
export const ErrorModeSchema = z
  .enum(["continue", "stop"])
  .default("continue")
  .optional();

export type ErrorMode = "continue" | "stop";
