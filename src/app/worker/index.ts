import { handleRegister, handleToken } from "./oauth/handlers";
import { wellKnownMetadata, protectedResourceMetadata } from "./oauth/metadata";
import { handleAuthorize } from "./oauth/consent";
import { handleMcp } from "./mcp-handler";
import { jsonResponse } from "@dav-worker/mcp-utils";
import type { Env } from "./session/types";

export type { SessionProps } from "./session/types";

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
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
