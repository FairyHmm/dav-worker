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
}

declare global {
  interface Window {
    __CONSENT__: ConsentData;
  }
}

export interface ConsentField {
  label: string;
  type: string;
  name: string;
  placeholder?: string;
  value: string;
  required?: boolean;
  // Static, developer-authored HTML — never user input. Write with the
  // `html` tagged template in App.svelte for editor syntax highlighting.
  hint?: string;
}
