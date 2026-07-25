import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import type { OAuthProviderOptions } from "@cloudflare/workers-oauth-provider";
import { createMcpHandler } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerFileTools } from "@dav-worker/files-tools";
import { registerCalendarTools, parseCalendarConfig } from "@dav-worker/calendar-tools";
import { parseFilesConfig } from "@dav-worker/files-locations";
import {
  createNextcloudWebDAVStorage,
  createNextcloudCalDAVStorage,
} from "@dav-worker/storage-nextcloud";
import { handleAuthorize } from "./consent.js";

// SPEC-MONOREPO.md's Layer 2 `Credential` + the config-path pair that would
// otherwise live in a separate `SessionConfigStore` (Session Config
// section), collapsed into one object: `workers-oauth-provider`'s grant
// `props` is already a session-keyed encrypted store, so there's no need
// for TOKEN_STORE/SESSION_CONFIG_STORE KV as separate stores. `configs` is
// deliberately open-ended (more DAV collections — address books, etc. —
// slot in here later without a shape change to `credential`).
export interface SessionProps {
  credential: { host: string; username: string; password: string };
  configs: {
    locations: string;
    calendars: string;
  };
}

// TODO-MONOREPO 9e: resolves props.configs.{locations,calendars} at their
// session paths via the same NextcloudWebDAVStorage used for file tools
// (a config path is just another vault file) instead of the previous
// build-time-bundled files.toml/calendars.toml. Called once per request —
// createServer runs fresh per request already, so this doubles as the
// "per-request cache" SPEC-MONOREPO.md's Session Config section asks for;
// no separate cache needed on top of that.
async function createServer(props: SessionProps): Promise<McpServer> {
  const server = new McpServer({
    name: "dav-worker",
    version: "0.1.0",
  });

  const fileStorage = createNextcloudWebDAVStorage(props.credential);
  const calendarStorage = createNextcloudCalDAVStorage(props.credential);

  const [locationsRaw, calendarsRaw] = await Promise.all([
    fileStorage.read(props.configs.locations),
    fileStorage.read(props.configs.calendars),
  ]);
  const filesConfig = parseFilesConfig(locationsRaw.content);
  const calendarConfig = parseCalendarConfig(calendarsRaw.content);

  registerFileTools(server, { storage: fileStorage, config: filesConfig });
  registerCalendarTools(server, { storage: calendarStorage, config: calendarConfig });

  return server;
}

// Typed loosely (not `ExportedHandler<Env>`) deliberately: `workers-oauth-provider`
// pulls its own copy of `@cloudflare/workers-types` as a nested dependency,
// which is structurally identical to but a nominally different `Request`/
// `Headers` than the root's — a workspace dual-package hazard, not a real
// type error. `any` at this one boundary avoids fighting that duplication;
// everything inside `fetch` is cast back to the real `Env`/`Request` types.
const apiHandler = {
  async fetch(request: any, env: any, ctx: any): Promise<Response> {
    const props = (ctx as ExecutionContext & { props: SessionProps }).props;
    const server = await createServer(props);
    return createMcpHandler(server)(request as Request, env as Env, ctx as ExecutionContext);
  },
};

const defaultHandler = {
  fetch(request: any, env: any, _ctx: any): Response | Promise<Response> {
    const url = new URL((request as Request).url);
    if (url.pathname === "/authorize") {
      return handleAuthorize(
        request as Request,
        env as { OAUTH_PROVIDER: import("@cloudflare/workers-oauth-provider").OAuthHelpers },
      );
    }
    return new Response("Not found", { status: 404 });
  },
};

export default new OAuthProvider({
  apiRoute: "/mcp",
  // Cast at this one boundary, not throughout the file: the duplicate-
  // `@cloudflare/workers-types` issue described above means our `Response`
  // is structurally but not nominally the library's `Response`. Runtime
  // behavior is identical.
  apiHandler: apiHandler as unknown as OAuthProviderOptions["apiHandler"],
  defaultHandler: defaultHandler as unknown as OAuthProviderOptions["defaultHandler"],
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});
