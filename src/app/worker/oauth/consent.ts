// No grant store: client_id is itself a sealed token, and the code handed
// back is a sealed, short-lived blob of the credential + PKCE challenge.
import { seal, open, verifyPkce, TokenError } from "../auth";
import type { SessionProps } from "../session/types";
// Consent UI is a Svelte SPA built separately (vite.config.ts) into one
// static HTML file, pulled in as raw text via esbuild's .html loader.
import { consentHtml } from "../consent/dist/asset";

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
  logo_uri?: string;
}

interface CodePayload {
  props: SessionProps;
  codeChallenge: string;
  redirectUri: string;
}

const CODE_TTL_SECONDS = 120;
const DEFAULT_CONFIG_PATH = "/.config/dav-worker.conf";

export async function handleAuthorize(
  request: Request,
  secret: string,
): Promise<Response> {
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
    return new Response("redirect_uri does not match registered client", {
      status: 400,
    });
  }

  return new Response(renderConsentPage(params, registration), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

async function handleConsentSubmit(
  request: Request,
  secret: string,
): Promise<Response> {
  const form = await request.formData();

  const clientId = String(form.get("clientId") ?? "");
  const redirectUri = String(form.get("redirectUri") ?? "");
  const state = String(form.get("state") ?? "");
  const codeChallenge = String(form.get("codeChallenge") ?? "");

  const host = String(form.get("host") ?? "").trim();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const configPath =
    String(form.get("configPath") ?? "").trim() || DEFAULT_CONFIG_PATH;

  // Re-validated here too: the client_id/redirect_uri came back from the
  // browser via hidden fields, so treat them as untrusted input again.
  let registration: ClientRegistration;
  try {
    registration = await open<ClientRegistration>(secret, clientId);
  } catch {
    return new Response("Invalid client", { status: 400 });
  }
  if (!registration.redirect_uris.includes(redirectUri)) {
    return new Response("redirect_uri does not match registered client", {
      status: 400,
    });
  }

  const props: SessionProps = {
    credential: { host, username, password },
    configs: { path: configPath },
  };
  const payload: CodePayload = { props, codeChallenge, redirectUri };
  const code = await seal(secret, payload, CODE_TTL_SECONDS);

  const redirect = new URL(redirectUri);
  redirect.searchParams.set("code", code);
  redirect.searchParams.set("state", state);
  return Response.redirect(redirect.toString(), 302);
}

// JS-string-in-HTML injection, not attribute/text interpolation — escape
// characters that could break out of the JSON string or script context.
function escapeForInlineScript(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function renderConsentPage(
  params: AuthorizeParams,
  registration: ClientRegistration,
): string {
  const data = {
    clientName: registration.client_name ?? params.clientId,
    clientId: params.clientId,
    redirectUri: params.redirectUri,
    state: params.state,
    codeChallenge: params.codeChallenge,
    defaultConfigPath: DEFAULT_CONFIG_PATH,
    logoUri: registration.logo_uri,
  };

  const script = `<script id="consent-data">window.__CONSENT__=${escapeForInlineScript(JSON.stringify(data))}</script>`;
  return consentHtml.replace('<script id="consent-data"></script>', script);
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
