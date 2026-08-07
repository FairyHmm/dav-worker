import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CfWorkerJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/cfworker";
import { registerFileTools } from "@dav-worker/files-tools";
import {
  registerCalendarTools,
  resolveCategoryColor,
  allCategories,
  findEventAcrossCalendars,
  findMasterEvent,
} from "@dav-worker/calendar-tools";
import { registerTaskTools } from "@dav-worker/task-tools";
import { parseAppConfig } from "@dav-worker/config-parser";
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
import { handleAuthorize, exchangeCode } from "./src/consent";
import { seal, open, TokenError } from "./src/auth";

// No grant store — every token is self-contained (see auth.ts), living
// only encrypted in the client's hands, never server-side.
export interface SessionProps {
  credential: { host: string; username: string; password: string };
  // Single path to the merged config.toml (SPEC-CONFIG.md).
  configs: {
    path: string;
  };
}

interface Env {
  TOKEN_KEY: string;
}

async function loadConfig(
  path: string,
  fileStorage: { read(path: string): Promise<{ content: string }> },
): Promise<string> {
  try {
    return (await fileStorage.read(path)).content;
  } catch (err) {
    // File is optional — empty doc is the bootstrap state until config_set writes it.
    if (err instanceof WebDAVHttpError && err.status === 404) return "";
    throw err;
  }
}

async function createServer(props: SessionProps): Promise<McpServer> {
  // Ajv (SDK default) uses `new Function` at runtime, which workerd disallows.
  const server = new McpServer(
    {
      name: "dav-worker",
      version: "0.1.0",
    },
    { jsonSchemaValidator: new CfWorkerJsonSchemaValidator() },
  );

  const fileStorage = createNextcloudWebDAVStorage(props.credential);
  const calendarStorage = createNextcloudCalDAVStorage(props.credential);
  const taskStorage = createNextcloudCalDAVTaskStorage(props.credential);

  const configContent = await loadConfig(props.configs.path, fileStorage);
  const { locations: filesConfig, calendars: calendarConfig } =
    parseAppConfig(configContent);

  // Sole sanctioned cross-domain edge into calendar data (SPEC-MONOREPO.md
  // A.7): tasks only have a UID, so this searches all calendars for it.
  // findMasterEvent matters since detached RECURRENCE-ID overrides can
  // sit alongside the master VEVENT — DTSTART must come from the master.
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

  // Same edge as resolveEventDue, but a pure config lookup, no round-trip.
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

// RFC 7591, stateless: client_id itself is the sealed registration.
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

  // No ttlSeconds — Nextcloud app-password revocation is the real kill switch.
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

// RFC 9728 — without this, MCP clients treat the connection as failed
// even after a successful token exchange.
function protectedResourceMetadata(origin: string) {
  return {
    resource: `${origin}/mcp`,
    authorization_servers: [origin],
  };
}

async function handleMcp(request: Request, env: Env): Promise<Response> {
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
    // Distinguish bad credentials (401) from anything else (502); never
    // echo err.message — a parse error could quote the user's own config.
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

  // Stateless, rebuilt per request like `server` — no session to resume.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
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
      return handleMcp(request, env);
    }
    return new Response("Not found", { status: 404 });
  },
};
