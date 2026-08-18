import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types";
import type { ZodRawShape, z } from "zod";
import { resolve, type DisabledShape } from "@dav-worker/config-parser";
import {
  withBatchSupport,
  runBatchTool,
  type Resolved,
  type RunBatchToolParams,
} from "@dav-worker/batch-core";
import { err, ok } from "./response";

export interface ToolConfig<Shape extends ZodRawShape> {
  description: string;
  annotations: Record<string, unknown>;
  // MCP Apps resource name — resolved to _meta.ui.resourceUri on registration.
  ui?: string;
  itemShape: Shape;
}

// ok()/err() return structurally incompatible shapes; the union avoids rejecting valid ok() results.
export type BatchResult = ReturnType<typeof ok> | ReturnType<typeof err>;

export interface ToolEntry {
  name: string;
  category: string;
}

// Stateless overload: callers can omit state/options when unneeded.
export function defineTool<
  Shape extends ZodRawShape,
  RequiredKeys extends keyof z.infer<z.ZodObject<Shape>> = never,
>(
  server: McpServer,
  category: string,
  disabled: DisabledShape,
  name: string,
  config: ToolConfig<Shape>,
  fn: (item: Resolved<Shape, RequiredKeys>) => Promise<BatchResult>,
  options?: undefined,
  collector?: ToolEntry[],
): void;
// Stateful overload: callers need to thread state across batch items.
export function defineTool<
  Shape extends ZodRawShape,
  RequiredKeys extends keyof z.infer<z.ZodObject<Shape>> = never,
  TState = undefined,
>(
  server: McpServer,
  category: string,
  disabled: DisabledShape,
  name: string,
  config: ToolConfig<Shape>,
  fn: (
    item: Resolved<Shape, RequiredKeys>,
    state: TState,
  ) => Promise<{ result: BatchResult; state: TState }>,
  options: {
    initial: TState;
    didApply: (result: BatchResult) => boolean;
  },
  collector?: ToolEntry[],
): void;
// Merged overload: accepts either stateless or stateful signatures.
export function defineTool<
  Shape extends ZodRawShape,
  RequiredKeys extends keyof z.infer<z.ZodObject<Shape>> = never,
  TState = undefined,
>(
  server: McpServer,
  category: string,
  disabled: DisabledShape,
  name: string,
  config: ToolConfig<Shape>,
  fn:
    | ((item: Resolved<Shape, RequiredKeys>) => Promise<BatchResult>)
    | ((
        item: Resolved<Shape, RequiredKeys>,
        state: TState,
      ) => Promise<{ result: BatchResult; state: TState }>),
  options?: {
    initial: TState;
    didApply: (result: BatchResult) => boolean;
  },
  collector?: ToolEntry[],
): void {
  if (resolve(category, name, disabled) !== "ENABLED") return;
  collector?.push({ name, category });
  const { description, annotations, ui, itemShape } = config;

  // Type compatibility: handler params must match inputSchema, but SDK
  // conditional types prevent direct matching. Cast to unknown resolves
  // the structural compatibility at runtime.
  const handler = async (
    params: RunBatchToolParams<Shape> & Record<string, unknown>,
    _extra: unknown,
  ): Promise<CallToolResult> =>
    options
      ? runBatchTool(
          params,
          itemShape,
          err,
          fn as (
            item: Resolved<Shape, RequiredKeys>,
            state: TState,
          ) => Promise<{ result: BatchResult; state: TState }>,
          options,
        )
      : runBatchTool(
          params,
          itemShape,
          err,
          fn as (item: Resolved<Shape, RequiredKeys>) => Promise<BatchResult>,
        );

  server.registerTool(
    name,
    {
      description,
      // category rides on annotations so tools/list carries it to the config
      // UI; the SDK's ToolAnnotations type doesn't declare it, hence the cast.
      annotations: { ...annotations, category } as Record<string, unknown>,
      _meta: {
        ...(ui && {
          ui: {
            resourceUri: `ui://${ui}`,
          },
        }),
      },
      inputSchema: {
        ...itemShape,
        ...withBatchSupport(itemShape),
      },
    },
    // Overload work-around: runBatchTool has two overloads but a pass-through
    // call can't preserve which variant was selected. Restating the
    // union preserves the type information for the union overload.
    handler as unknown as Parameters<typeof server.registerTool>[2],
  );
}
