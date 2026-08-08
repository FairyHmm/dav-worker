// Stateless: a token is valid iff it decrypts under TOKEN_KEY. No lookup
// anywhere — see SPEC-STATELESS-AUTH.md for the revocation trade-off.

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(s: string): Uint8Array {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

// ttlSeconds omitted/undefined = never expires (see spec: access tokens are
// long-lived by design, real revocation happens Nextcloud-side). Auth codes
// always pass a short ttlSeconds — that TTL is the handshake window, not
// negotiable the way access-token lifetime is.
export async function seal(secret: string, payload: unknown, ttlSeconds?: number): Promise<string> {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const exp = ttlSeconds === undefined ? null : Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = JSON.stringify({ payload, exp });
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(body));
  return `${toBase64(iv)}.${toBase64(new Uint8Array(cipher))}`;
}

export class TokenError extends Error {}

export async function open<T>(secret: string, token: string): Promise<T> {
  const [ivPart, cipherPart] = token.split(".");
  if (!ivPart || !cipherPart) throw new TokenError("token is malformed");

  let plainBuf: ArrayBuffer;
  try {
    const key = await deriveKey(secret);
    plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(ivPart) },
      key,
      fromBase64(cipherPart),
    );
  } catch {
    throw new TokenError("token is malformed or was not sealed with this key");
  }

  const { payload, exp } = JSON.parse(new TextDecoder().decode(plainBuf)) as {
    payload: T;
    exp: number | null;
  };
  if (exp !== null && Math.floor(Date.now() / 1000) > exp) throw new TokenError("token expired");
  return payload;
}

// PKCE (RFC 7636) S256 verification — required since /authorize and /token
// are now two independent stateless requests with nothing else binding them
// together besides what the client itself proves it holds.
export async function verifyPkce(verifier: string, challenge: string): Promise<boolean> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return toBase64(new Uint8Array(digest)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") === challenge;
}
