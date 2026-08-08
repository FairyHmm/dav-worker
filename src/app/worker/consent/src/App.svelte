<script lang="ts">
  import "./types";
  import { Card, Input, Label, Button } from "@dav-worker/ui-shared";
  import type { ConsentField } from "./types";

  const html = (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce((out, s, i) => out + s + (values[i] ?? ""), "");

  const data = window.__CONSENT__;

  const fields = $state<ConsentField[]>([
    {
      label: "Nextcloud host",
      type: "url",
      name: "host",
      placeholder: "https://cloud.example.com",
      value: "",
      required: true,
    },
    {
      label: "Username",
      type: "text",
      name: "username",
      value: "",
      required: true,
    },
    {
      label: "Password",
      type: "password",
      name: "password",
      value: "",
      required: true,
      hint: html`App passwords are recommended over your main account password.`,
    },
    {
      label: "Config path",
      type: "text",
      name: "configPath",
      placeholder: "/.config/dav-worker.conf",
      value: data.defaultConfigPath,
      hint: html`Created automatically if missing. TOML-formatted, but
        <mark>.conf</mark> is recommended since Nextcloud won't open
        <mark>.toml</mark> files natively in its web UI.`,
    },
  ]);
</script>

<main class="flex min-h-screen items-center justify-center p-4 max-md:p-6">
  <Card class="w-[24rem] max-w-full p-6">
    <h1 class="text-host-lg font-medium leading-snug tracking-tight mb-3">
      {data.clientName} wants to connect to your Nextcloud
    </h1>
    <p class="text-host-xs text-host-text-secondary leading-relaxed mt-1 mb-0">
      Nothing you enter here is stored on the server. Your Nextcloud credential
      and config path travel only inside your client's own encrypted access
      token.
    </p>

    <form method="POST" class="mt-8 flex flex-col gap-5">
      <input type="hidden" name="clientId" value={data.clientId} />
      <input type="hidden" name="redirectUri" value={data.redirectUri} />
      <input type="hidden" name="state" value={data.state} />
      <input type="hidden" name="codeChallenge" value={data.codeChallenge} />

      {#each fields as field}
        <div class="flex flex-col gap-1">
          <Label for={field.name}>{field.label}</Label>
          <Input
            type={field.type}
            name={field.name}
            placeholder={field.placeholder}
            bind:value={field.value}
            required={field.required}
          />
          {#if field.hint}
            <p
              class="text-host-xs text-host-text-secondary leading-relaxed mt-1 mb-0"
            >
              {@html field.hint}
            </p>
          {/if}
        </div>
      {/each}

      <Button type="submit" class="mt-2 self-start">Connect</Button>
    </form>
  </Card>
</main>

<style>
  p :global(mark) {
    background: var(--color-host-warning-bg);
    color: var(--color-host-warning-text);
    border-radius: var(--radius-host-xs);
    padding: 0 0.2em;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
</style>
