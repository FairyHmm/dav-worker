// Vite entry point — mounts the consent screen into #app (see index.html).
// Data injected by the worker via ../oauth.ts (client name, hidden OAuth
// fields, default config path) travels via window.__CONSENT__, read by
// App.svelte itself — the worker's job is to validate and serve, not to
// know Svelte's mount shape.
import "@dav-worker/ui-shared/tokens.css";
import { mount } from "svelte";
import App from "./App.svelte";

// `pnpm dev:consent` runs this outside the worker, so nothing injects
// window.__CONSENT__ — fill in fixture data for a standalone dev/design
// loop. import.meta.env.DEV is stripped in the production build.
if (import.meta.env.DEV && !window.__CONSENT__) {
  window.__CONSENT__ = {
    clientName: "Example MCP Client",
    clientId: "dev-client-id",
    redirectUri: "http://localhost:3000/callback",
    state: "dev-state",
    codeChallenge: "dev-code-challenge",
    defaultConfigPath: "/.config/dav-worker.conf",
  };
}

mount(App, { target: document.getElementById("app")! });
