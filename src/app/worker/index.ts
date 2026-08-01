import { createMcpHandler } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerFileTools } from "@dav-worker/files-tools";
import {
  registerCalendarTools,
  parseCalendarConfig,
  resolveCategoryColor,
  allCategories,
  findEventAcrossCalendars,
  findMasterEvent,
} from "@dav-worker/calendar-tools";
import { registerTaskTools } from "@dav-worker/task-tools";
import { parseFilesConfig } from "@dav-worker/files-locations";
import {
  parseCalendar,
  findAllComponents,
  getDateTime,
  basicToIso,
} from "@dav-worker/calendar-ical";
import {
  createNextcloudWebDAVStorage,
  createNextcloudCalDAVStorage,
  createNextcloudCalDAVTaskStorage,
  WebDAVHttpError,
} from "@dav-worker/storage-nextcloud";
import { handleAuthorize, exchangeCode } from "./consent.js";
import { seal, open, TokenError } from "./auth.js";
import defaultLocationsToml from "./fixtures/locations.toml";
import defaultCalendarsCsv from "./fixtures/calendars.csv";

// No `workers-oauth-provider`, no OAUTH_KV, no grant store of any kind:
// every token in this file is self-contained (see auth.ts). SessionProps
// is exactly what used to live in a grant's `props` — now it only ever
// exists encrypted inside a token the client holds, never server-side.
export interface SessionProps {
  credential: { host: string; username: string; password: string };
  configs: {
    locations: string;
    calendars: string;
  };
}

interface Env {
  TOKEN_KEY: string;
}

// Blank config path from the consent screen falls back to the bundled
// fixture (mirrors app/local's fixture fallback) instead of hitting
// Nextcloud with an empty path. Temporary — goes away once arbitrary
// per-user config paths are the only supported mode (Fairy's call).
async function loadConfig(
  path: string,
  defaultToml: string,
  fileStorage: { read(path: string): Promise<{ content: string }> },
): Promise<string> {
  if (!path) return defaultToml;
  return (await fileStorage.read(path)).content;
}

async function createServer(props: SessionProps): Promise<McpServer> {
  const server = new McpServer({
    name: "dav-worker",
    version: "0.1.0",
  });

  const fileStorage = createNextcloudWebDAVStorage(props.credential);
  const calendarStorage = createNextcloudCalDAVStorage(props.credential);
  const taskStorage = createNextcloudCalDAVTaskStorage(props.credential);

  const [locationsContent, calendarsContent] = await Promise.all([
    loadConfig(props.configs.locations, defaultLocationsToml, fileStorage),
    loadConfig(props.configs.calendars, defaultCalendarsCsv, fileStorage),
  ]);
  const filesConfig = parseFilesConfig(locationsContent);
  const calendarConfig = parseCalendarConfig(calendarsContent);

  // resolveEventDue is the one sanctioned cross-domain edge into calendar
  // data (SPEC-MONOREPO.md A.7, tasks/tools/src/deps.ts): task_create/
  // task_update ask "what's this event's due-equivalent start?" given only
  // an event UID (no calendar name), so this must search across all
  // configured calendars, then pull DTSTART out of the matched VEVENT.
  // Reuses calendar/tools' findEventAcrossCalendars/findMasterEvent
  // (exported publicly for exactly this) rather than duplicating the
  // cross-calendar UID search or splitting it into its own package —
  // app/worker is the sole wiring point and is allowed to depend on
  // calendar/tools directly. findMasterEvent matters because a resolved
  // event's calendar-data can hold a recurring master plus detached
  // RECURRENCE-ID overrides as sibling VEVENTs — DTSTART must come from
  // the master, not whichever VEVENT parses first.
  const resolveEventDue = async (eventId: string): Promise<string | null> => {
    const { found } = await findEventAcrossCalendars(
      calendarStorage,
      calendarConfig,
      "VEVENT",
      eventId,
    );
    if (!found?.entry.calendarData) return null;
    const cal = parseCalendar(found.entry.calendarData);
    const events = findAllComponents(cal, "VEVENT");
    const master = findMasterEvent(events) ?? events[0];
    if (!master) return null;
    const dt = getDateTime(master, "DTSTART");
    if (!dt) return null;
    return basicToIso(dt.raw);
  };

  // resolveCategoryColor mirrors resolveEventDue's edge exactly — same
  // rationale, same wiring point, just a pure config lookup instead of a
  // Nextcloud round-trip.
  const resolveCategoryColorFn = (category: string): string =>
    resolveCategoryColor(calendarConfig, category);

  registerFileTools(server, { storage: fileStorage, config: filesConfig });
  registerCalendarTools(server, {
    storage: calendarStorage,
    config: calendarConfig,
  });
  registerTaskTools(server, {
    storage: taskStorage,
    resolveEventDue,
    resolveCategoryColor: resolveCategoryColorFn,
    categories: allCategories(calendarConfig),
  });

  return server;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Dynamic Client Registration (RFC 7591), stateless: the returned
// `client_id` *is* the registration, sealed under TOKEN_KEY. There is
// nothing to look up later — /authorize just re-opens the client_id to
// recover the redirect_uris it was issued for.
async function handleRegister(
  request: Request,
  secret: string,
): Promise<Response> {
  const body = (await request.json()) as {
    redirect_uris?: string[];
    client_name?: string;
  };
  const redirect_uris = body.redirect_uris ?? [];
  if (redirect_uris.length === 0) {
    return jsonResponse(
      {
        error: "invalid_client_metadata",
        error_description: "redirect_uris required",
      },
      400,
    );
  }
  const client_id = await seal(secret, {
    redirect_uris,
    client_name: body.client_name,
  });
  return jsonResponse({
    client_id,
    redirect_uris,
    client_name: body.client_name,
    token_endpoint_auth_method: "none",
  });
}

async function handleToken(
  request: Request,
  secret: string,
): Promise<Response> {
  const form = await request.formData();
  if (String(form.get("grant_type")) !== "authorization_code") {
    return jsonResponse({ error: "unsupported_grant_type" }, 400);
  }
  const code = String(form.get("code") ?? "");
  const codeVerifier = String(form.get("code_verifier") ?? "");

  let props: SessionProps;
  try {
    props = await exchangeCode(secret, code, codeVerifier);
  } catch (err: unknown) {
    const description =
      err instanceof TokenError ? err.message : "invalid code";
    return jsonResponse(
      { error: "invalid_grant", error_description: description },
      400,
    );
  }

  // No ttlSeconds: access tokens are long-lived by design (see
  // Docs/SPEC-STATELESS-AUTH.md Token lifetime — Nextcloud app-password
  // revocation is the real kill switch, not a worker-side TTL).
  const access_token = await seal(secret, props);
  return jsonResponse({
    access_token,
    token_type: "bearer",
  });
}

function wellKnownMetadata(origin: string) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/authorize`,
    token_endpoint: `${origin}/token`,
    registration_endpoint: `${origin}/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  };
}

// RFC 9728 protected-resource metadata. MCP clients (incl. Claude) fetch
// this during connection discovery to confirm which authorization
// server(s) are valid for this resource — without it, clients may treat
// the connection as failed even after a successful token exchange.
function protectedResourceMetadata(origin: string) {
  return {
    resource: `${origin}/mcp`,
    authorization_servers: [origin],
  };
}

async function handleMcp(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const authHeader = request.headers.get("authorization") ?? "";
  const match = /^Bearer (.+)$/i.exec(authHeader);
  if (!match) {
    return new Response("Missing bearer token. Connect via /authorize.", {
      status: 401,
    });
  }

  let props: SessionProps;
  try {
    props = await open<SessionProps>(env.TOKEN_KEY, match[1]);
  } catch {
    return new Response("Invalid or expired token. Reconnect via /authorize.", {
      status: 401,
    });
  }

  let server: McpServer;
  try {
    server = await createServer(props);
  } catch (err) {
    // Session setup (config-path reads, TOML parsing) failing shouldn't
    // crash the request with a bare 500 — distinguish "your Nextcloud
    // credential is wrong" (401, re-auth via /authorize is the fix) from
    // everything else (bad config path, malformed TOML, Nextcloud
    // unreachable — 502). Neither branch echoes `err.message` back to the
    // client: a parse error could quote back arbitrary bytes from the
    // user's own config file.
    if (err instanceof WebDAVHttpError && err.status === 401) {
      return new Response(
        "Nextcloud authentication failed. Reconnect via /authorize.",
        { status: 401 },
      );
    }
    return new Response(
      "Failed to start session: could not load Nextcloud config.",
      { status: 502 },
    );
  }

  return createMcpHandler(server)(
    request,
    env as unknown as globalThis.Env,
    ctx,
  );
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/.well-known/oauth-authorization-server") {
      return jsonResponse(wellKnownMetadata(url.origin));
    }
    if (
      url.pathname === "/.well-known/oauth-protected-resource" ||
      url.pathname === "/.well-known/oauth-protected-resource/mcp"
    ) {
      return jsonResponse(protectedResourceMetadata(url.origin));
    }
    if (url.pathname === "/register" && request.method === "POST") {
      return handleRegister(request, env.TOKEN_KEY);
    }
    if (url.pathname === "/authorize") {
      return handleAuthorize(request, env.TOKEN_KEY);
    }
    if (url.pathname === "/token" && request.method === "POST") {
      return handleToken(request, env.TOKEN_KEY);
    }
    if (url.pathname === "/mcp") {
      return handleMcp(request, env, ctx);
    }
    return new Response("Not found", { status: 404 });
  },
};
