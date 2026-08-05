import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import type { FileToolsDeps } from "../deps";
import { ok, err } from "../utils/response";
import { resolvePath } from "../utils/path";
import { combineWholeFile } from "../utils/write-mode";
import {
  LocationSchema,
  ModeSchema,
  PathSchema,
  TargetSchema,
} from "../utils/schemas";
import { resolveTarget } from "@dav-worker/files-parser";
import {
  withBatchSupport,
  runBatchTool,
  required,
  locked,
  type Resolved,
} from "@dav-worker/batch-core";

function createItemShape() {
  return {
    path: PathSchema.optional(),
    location: locked(LocationSchema),
    // required(): content is what makes each item distinct, unlike
    // `mode`, which can sensibly fall back to a shared top-level value.
    content: required(z.string().describe("Text content to write").optional()),
    target: TargetSchema,
    mode: ModeSchema,
  };
}

type WriteItem = Resolved<ReturnType<typeof createItemShape>, "content">;

export function registerWriteTool(
  server: McpServer,
  deps: FileToolsDeps,
): void {
  const itemShape = createItemShape();

  server.registerTool(
    "file_write",
    {
      description: "Write text content to a file.",
      annotations: {
        title: "Write File",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
        ...itemShape,
        ...withBatchSupport(itemShape),
      },
    },
    async (params) =>
      runBatchTool(
        params,
        itemShape,
        err,
        (item: WriteItem, state: Record<string, number>) =>
          writeFileItem(deps, item, state),
        {
          // Per-path line-count delta so far in this batch, so a caller can
          // plan a batch of raw edits against one original read instead of
          // hand-adjusting later from/to for each earlier edit.
          initial: {},
          didApply: (result: { isError?: boolean } | { content: unknown[] }) =>
            !("isError" in result && result.isError),
        },
      ),
  );
}

async function writeFileItem(
  deps: FileToolsDeps,
  item: WriteItem,
  state: Record<string, number>,
) {
  const { path: pathArg, location, content, target, mode } = item;
  try {
    const path = resolvePath(deps.config, { path: pathArg, location });
    const client = deps.storage;
    const shift = state[path] ?? 0;
    const resolved = resolveTarget(target, shift);

    if (resolved.kind === "whole-file") {
      // A whole-file write replaces the content a later raw shift for this
      // path would be based on, so drop any accumulated shift for it.
      const restState = { ...state };
      delete restState[path];

      if (mode === "replace") {
        // No existing content to combine with, so skip combineWholeFile.
        const { created } = await client.write(path, content);
        return {
          result: ok(created ? `Created: ${path}` : `Updated: ${path}`),
          state: restState,
        };
      }
      const { combined, fileExists } = await combineWholeFile(
        client,
        path,
        content,
        mode,
      );
      const { created } = await client.write(path, combined);
      return {
        result: ok(
          fileExists
            ? `${mode === "append" ? "Appended to" : "Prepended to"}: ${path}`
            : `Created: ${path}${created ? "" : " (unexpectedly already existed)"}`,
        ),
        state: restState,
      };
    }

    const { content: existing } = await client.read(path);
    const updated = resolved.write(existing, content, mode);
    if (updated === undefined) {
      return { result: err(new Error(resolved.notFoundError)), state };
    }
    await client.write(path, updated);

    const delta = updated.split("\n").length - existing.split("\n").length;
    const nextState = { ...state, [path]: shift + delta };

    return {
      result: ok(`Updated ${resolved.describe(mode)} in ${path}`),
      state: nextState,
    };
  } catch (e) {
    return { result: err(e), state };
  }
}
