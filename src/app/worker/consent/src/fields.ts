import type { ConsentField } from "./types";

// Tagged template for hint HTML — gives editor syntax highlighting;
// content is static/developer-authored, never user input.
const html = (strings: TemplateStringsArray, ...values: unknown[]) =>
  strings.reduce((out, s, i) => out + s + (values[i] ?? ""), "");

// First CONNECTION_FIELD_COUNT fields render under the "Connection"
// header, the rest under "Configuration" — see App.svelte.
export const CONNECTION_FIELD_COUNT = 3;

export function createFields(defaultConfigPath: string): ConsentField[] {
  return [
    {
      label: "Nextcloud host",
      type: "url",
      name: "host",
      placeholder: "https://cloud.example.com",
      value: "",
      required: true,
      autocomplete: "url",
      // Bare hosts are the common slip — default to https rather than
      // reject, since Nextcloud instances are effectively always TLS.
      normalize: (v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v),
    },
    {
      label: "Username",
      type: "text",
      name: "username",
      value: "",
      required: true,
      autocomplete: "username",
    },
    {
      label: "App password",
      type: "password",
      name: "password",
      value: "",
      required: true,
      autocomplete: "current-password",
      hint: html`We recommend an
        <a
          href="https://docs.nextcloud.com/server/latest/user_manual/en/session_management.html#managing-devices"
          target="_blank"
          rel="noopener"
          >app password</a
        >
        over your account password.`,
    },
    {
      label: "Config path",
      type: "text",
      name: "configPath",
      placeholder: "/.config/dav-worker.conf",
      value: defaultConfigPath,
      hint: html`Created automatically if missing.
        <a href="https://toml.io/en" target="_blank" rel="noopener">TOML</a>
        format, <code>.conf</code> extension recommended.`,
    },
  ];
}
