// Shape of window.__CONSENT__, injected by the worker into the served
// HTML (see ../oauth.ts). Hidden OAuth fields travel here rather
// than through Svelte props, since there's no server-side render step —
// the worker only string-injects into a static build.
export interface ConsentData {
  clientName: string;
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  defaultConfigPath: string;
  // Self-asserted at registration (RFC 7591 logo_uri) — shown with a
  // fallback glyph, never trusted as verified client identity.
  logoUri?: string;
}

declare global {
  interface Window {
    __CONSENT__: ConsentData;
  }
}

export interface ConsentField {
  label: string;
  // One-line explanation shown under the label, above the input —
  // distinct from `hint`, which sits below the input and can carry links.
  description?: string;
  type: string;
  name: string;
  placeholder?: string;
  value: string;
  required?: boolean;
  // Static, developer-authored HTML — never user input. Write with the
  // `html` tagged template in App.svelte for editor syntax highlighting.
  hint?: string;
  // Standard token, e.g. "url" or "current-password" — password managers
  // key off this (plus name) to decide what to fill and where to save it.
  autocomplete?: string;
  // Normalize on blur rather than on input, so we don't fight the user
  // mid-keystroke (e.g. prefixing https:// onto a bare host).
  normalize?: (value: string) => string;
}
