// Stateless auth primitive: every token (authorization code *and* access
// token) is the payload itself, AES-GCM-encrypted under SESSION_SECRET.
// There is no grant store, no KV, nothing keyed by session anywhere — a
// token is valid iff it decrypts and hasn't expired. Losing SESSION_SECRET
// (a Worker secret, not user data) invalidates every outstanding token at
// once; that's the whole revocation story, and it's intentional.

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function seal(secret: string, payload: unknown, ttlSeconds: number): Promise<string> {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const body = JSON.stringify({ payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds });
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(body));
  const combined = new Uint8Array(iv.length + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.length);
  return base64UrlEncode(combined);
}

export class TokenError extends Error {}

export async function open<T>(secret: string, token: string): Promise<T> {
  let plainBuf: ArrayBuffer;
  try {
    const key = await deriveKey(secret);
    const combined = base64UrlDecode(token);
    const iv = combined.slice(0, 12);
    const cipher = combined.slice(12);
    plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  } catch {
    throw new TokenError("token is malformed or was not sealed with this secret");
  }
  const { payload, exp } = JSON.parse(new TextDecoder().decode(plainBuf)) as {
    payload: T;
    exp: number;
  };
  if (Math.floor(Date.now() / 1000) > exp) throw new TokenError("token expired");
  return payload;
}

// PKCE (RFC 7636) S256 verification — required since /authorize and /token
// are now two independent stateless requests with nothing else binding them
// together besides what the client itself proves it holds.
export async function verifyPkce(verifier: string, challenge: string): Promise<boolean> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest)) === challenge;
}
