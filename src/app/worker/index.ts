import { handleRegister, handleToken } from "./oauth/handlers";
import { wellKnownMetadata, protectedResourceMetadata } from "./oauth/metadata";
import { handleAuthorize } from "./oauth/consent";
import { handleMcp } from "./mcp-handler";
import { jsonResponse } from "@dav-worker/mcp-utils";
import type { Env } from "./session/types";
// @ts-ignore — resolved to the content-hashed runtime by svelteRuntimeLoader in build.mts
import {
  fileName as svelteRuntimeFileName,
  contents as svelteRuntimeContents,
} from "virtual:svelte-runtime";
// @ts-ignore — resolved by svgLoader in build.mts
import nextcloudIcon from "virtual:nextcloud-icon";

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
    if (url.pathname === `/${svelteRuntimeFileName}`) {
      // Path is content-hashed (see build-runtime.ts), so immutable caching
      // is safe: a runtime content change always produces a new URL.
      return new Response(svelteRuntimeContents, {
        headers: {
          "content-type": "application/javascript; charset=utf-8",
          "cache-control": "public, max-age=31536000, immutable",
        },
      });
    }
    if (
      url.pathname === "/nextcloud-icon.svg" ||
      (url.pathname.startsWith("/nextcloud-icon-") &&
        url.pathname.endsWith(".svg"))
    ) {
      return new Response(nextcloudIcon, {
        headers: {
          "content-type": "image/svg+xml; charset=utf-8",
          "cache-control": "public, max-age=31536000, immutable",
        },
      });
    }
    return new Response("Not found", { status: 404 });
  },
};
