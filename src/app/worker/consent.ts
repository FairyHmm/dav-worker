// Layer 1 (SPEC-MONOREPO.md) consent screen: `workers-oauth-provider`'s
// `defaultHandler` route for GET/POST /authorize. Collects Nextcloud
// credentials + locations/calendars config paths in one form, per the
// spec's "Consent screen contents" section — but stores the result
// straight into the grant's `props` (see index.ts's SessionProps) rather
// than separate TokenStore/SessionConfigStore KV stores, since
// `completeAuthorization`'s encrypted `props` already is a session-keyed
// store. "Log in with Nextcloud" (redirect-based) is deferred; only the
// direct host/username/password path is implemented here.

import type { OAuthHelpers, AuthRequest, ClientInfo } from "@cloudflare/workers-oauth-provider";
import type { SessionProps } from "./index.js";

interface AuthorizeEnv {
  OAUTH_PROVIDER: OAuthHelpers;
}

export async function handleAuthorize(request: Request, env: AuthorizeEnv): Promise<Response> {
  if (request.method === "POST") {
    return handleConsentSubmit(request, env);
  }

  const oauthReqInfo = await env.OAUTH_PROVIDER.parseAuthRequest(request);
  const clientInfo = await env.OAUTH_PROVIDER.lookupClient(oauthReqInfo.clientId);
  return new Response(renderConsentForm(oauthReqInfo, clientInfo), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

async function handleConsentSubmit(request: Request, env: AuthorizeEnv): Promise<Response> {
  const form = await request.formData();
  const oauthReqInfo: AuthRequest = JSON.parse(String(form.get("oauthReqInfo")));

  const host = String(form.get("host") ?? "").trim();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const locations = String(form.get("locationsConfigPath") ?? "").trim();
  const calendars = String(form.get("calendarsConfigPath") ?? "").trim();

  const props: SessionProps = {
    credential: { host, username, password },
    configs: { locations, calendars },
  };

  const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
    request: oauthReqInfo,
    // No user-account system here — this deploy is single-tenant-per-login
    // (SPEC.md: "personal utility"), so host+username is a stable enough
    // identity for grant enumeration/revocation.
    userId: `${host}:${username}`,
    metadata: { username, host },
    scope: oauthReqInfo.scope,
    props,
  });

  return Response.redirect(redirectTo, 302);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderConsentForm(oauthReqInfo: AuthRequest, clientInfo: ClientInfo | null): string {
  const clientName = clientInfo?.clientName ?? oauthReqInfo.clientId;
  const oauthReqInfoJson = escapeHtml(JSON.stringify(oauthReqInfo));

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Connect dav-worker</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 32rem; margin: 3rem auto; padding: 0 1rem; }
    h1 { font-size: 1.1rem; }
    label { display: block; margin-top: 1rem; font-size: 0.9rem; }
    input { width: 100%; box-sizing: border-box; padding: 0.5rem; margin-top: 0.25rem; }
    button { margin-top: 1.5rem; padding: 0.6rem 1.2rem; }
    p.hint { font-size: 0.8rem; color: #555; }
  </style>
</head>
<body>
  <h1>${escapeHtml(clientName)} wants to connect to your Nextcloud</h1>
  <form method="POST">
    <input type="hidden" name="oauthReqInfo" value='${oauthReqInfoJson}' />

    <label>Nextcloud host
      <input type="url" name="host" placeholder="https://cloud.example.com" required />
    </label>
    <label>Username
      <input type="text" name="username" required />
    </label>
    <label>Password
      <input type="password" name="password" required />
    </label>
    <p class="hint">App passwords are recommended over your main account password.</p>

    <label>Locations config path
      <input type="text" name="locationsConfigPath" placeholder="/locations.toml" />
    </label>
    <label>Calendars config path
      <input type="text" name="calendarsConfigPath" placeholder="/calendars.toml" />
    </label>

    <button type="submit">Connect</button>
  </form>
</body>
</html>`;
}
