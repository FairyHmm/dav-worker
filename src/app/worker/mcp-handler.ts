import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/server";
import { WebDAVHttpError } from "@dav-worker/storage-nextcloud";
import { open } from "./auth";
import { createServer } from "./session/bootstrap";
import type { SessionProps, Env } from "./session/types";

export async function handleMcp(request: Request, env: Env): Promise<Response> {
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

  let server;
  try {
    server = await createServer(props);
  } catch (err) {
    // Never echo err.message on the generic path — a parse error could
    // quote the user's own config back to an unauthenticated caller.
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
