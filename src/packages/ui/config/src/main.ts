import { mount } from "svelte";
import App from "./App.svelte";

if (import.meta.env.DEV) {
  const { installDevBridge } = await import("@dav-worker/ui-shared");
  await installDevBridge();
}

mount(App, { target: document.getElementById("app")! });
