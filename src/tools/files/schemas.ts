import { z } from "zod";

export const PathSchema = z
  .string()
  .describe("Vault-relative path (e.g. 'Documents/notes.md' or '')");
