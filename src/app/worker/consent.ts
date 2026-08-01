// Consent screen + authorization-code issuance. No `workers-oauth-provider`,
// no grant store: `client_id` is itself a sealed token (see auth.ts) proving
// which redirect_uris were registered, and the code this hands back is a
// sealed, short-lived blob of the Nextcloud credential + PKCE challenge.
// Nothing is written to any store anywhere in this file.

import { seal, open, verifyPkce, TokenError } from "./auth.js";
import type { SessionProps } from "./index.js";

interface AuthorizeParams {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scope: string;
}

interface ClientRegistration {
  redirect_uris: string[];
  client_name?: string;
}

interface CodePayload {
  props: SessionProps;
  codeChallenge: string;
  redirectUri: string;
}

const CODE_TTL_SECONDS = 120;

export async function handleAuthorize(request: Request, secret: string): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "POST") {
    return handleConsentSubmit(request, secret);
  }

  const params: AuthorizeParams = {
    clientId: url.searchParams.get("client_id") ?? "",
    redirectUri: url.searchParams.get("redirect_uri") ?? "",
    state: url.searchParams.get("state") ?? "",
    codeChallenge: url.searchParams.get("code_challenge") ?? "",
    scope: url.searchParams.get("scope") ?? "",
  };

  let registration: ClientRegistration;
  try {
    registration = await open<ClientRegistration>(secret, params.clientId);
  } catch (err: unknown) {
    const msg = err instanceof TokenError ? err.message : "invalid client_id";
    return new Response(`Invalid client: ${msg}`, { status: 400 });
  }
  if (!registration.redirect_uris.includes(params.redirectUri)) {
    return new Response("redirect_uri does not match registered client", { status: 400 });
  }

  return new Response(renderConsentForm(params, registration), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

async function handleConsentSubmit(request: Request, secret: string): Promise<Response> {
  const form = await request.formData();

  const clientId = String(form.get("clientId") ?? "");
  const redirectUri = String(form.get("redirectUri") ?? "");
  const state = String(form.get("state") ?? "");
  const codeChallenge = String(form.get("codeChallenge") ?? "");

  const host = String(form.get("host") ?? "").trim();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const locations = String(form.get("locationsConfigPath") ?? "").trim();
  const calendars = String(form.get("calendarsConfigPath") ?? "").trim();

  // Re-validated here too: the client_id/redirect_uri came back from the
  // browser via hidden fields, so treat them as untrusted input again.
  let registration: ClientRegistration;
  try {
    registration = await open<ClientRegistration>(secret, clientId);
  } catch {
    return new Response("Invalid client", { status: 400 });
  }
  if (!registration.redirect_uris.includes(redirectUri)) {
    return new Response("redirect_uri does not match registered client", { status: 400 });
  }

  const props: SessionProps = {
    credential: { host, username, password },
    configs: { locations, calendars },
  };
  const payload: CodePayload = { props, codeChallenge, redirectUri };
  const code = await seal(secret, payload, CODE_TTL_SECONDS);

  const redirect = new URL(redirectUri);
  redirect.searchParams.set("code", code);
  redirect.searchParams.set("state", state);
  return Response.redirect(redirect.toString(), 302);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderConsentForm(params: AuthorizeParams, registration: ClientRegistration): string {
  const clientName = registration.client_name ?? params.clientId;

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
  <p class="hint">Nothing you enter here is stored on the server. Your Nextcloud credential
    and config paths travel only inside your client's own encrypted access token.</p>
  <form method="POST">
    <input type="hidden" name="clientId" value="${escapeHtml(params.clientId)}" />
    <input type="hidden" name="redirectUri" value="${escapeHtml(params.redirectUri)}" />
    <input type="hidden" name="state" value="${escapeHtml(params.state)}" />
    <input type="hidden" name="codeChallenge" value="${escapeHtml(params.codeChallenge)}" />

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
      <input type="text" name="calendarsConfigPath" placeholder="/calendars.csv" />
    </label>

    <button type="submit">Connect</button>
  </form>
</body>
</html>`;
}

export async function exchangeCode(
  secret: string,
  code: string,
  codeVerifier: string,
): Promise<SessionProps> {
  const { props, codeChallenge } = await open<CodePayload>(secret, code);
  const ok = await verifyPkce(codeVerifier, codeChallenge);
  if (!ok) throw new TokenError("PKCE verification failed");
  return props;
}
