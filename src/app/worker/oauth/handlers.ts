import { seal, TokenError } from "../auth";
import { exchangeCode } from "./consent";
import { jsonResponse } from "@dav-worker/mcp-utils";
import type { SessionProps } from "../session/types";

// Self-asserted like client_name — only guards against non-https schemes
// (javascript:, data:) reaching the <img src> that renders this later.
function sanitizeLogoUri(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    return new URL(value).protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}

// RFC 7591, stateless: client_id itself is the sealed registration.
export async function handleRegister(
  request: Request,
  secret: string,
): Promise<Response> {
  const body = (await request.json()) as {
    redirect_uris?: string[];
    client_name?: string;
    logo_uri?: string;
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
  const logo_uri = sanitizeLogoUri(body.logo_uri);
  const client_id = await seal(secret, {
    redirect_uris,
    client_name: body.client_name,
    logo_uri,
  });
  return jsonResponse({
    client_id,
    redirect_uris,
    client_name: body.client_name,
    logo_uri,
    token_endpoint_auth_method: "none",
  });
}

export async function handleToken(
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
  return jsonResponse({ access_token, token_type: "bearer" });
}
