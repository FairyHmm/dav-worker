<script lang="ts">
  import "./types";
  import { Card, Button } from "@dav-worker/ui-shared";
  import { User, Settings } from "@lucide/svelte";
  import ConsentHeader from "./ConsentHeader.svelte";
  import FieldGroup from "./FieldGroup.svelte";
  import { createFields, CONNECTION_FIELD_COUNT } from "./fields";

  const data = window.__CONSENT__;
  const fields = $state(createFields(data.defaultConfigPath));

  // RFC 6749 §4.1.2.1 — a plain link, not a form submit; denial doesn't
  // touch the worker at all, so there's nothing to POST.
  const cancelUrl = (() => {
    const url = new URL(data.redirectUri);
    url.searchParams.set("error", "access_denied");
    url.searchParams.set("state", data.state);
    return url.toString();
  })();
</script>

<main class="flex min-h-screen items-center justify-center p-4 max-md:p-6">
  <Card class="w-[44rem] max-w-full p-8">
    <ConsentHeader clientName={data.clientName} logoUri={data.logoUri} />

    <p
      class="text-host-sm text-host-text-secondary leading-relaxed mt-1 mb-0 text-center"
    >
      {data.clientName} will have full access to your Nextcloud account. Your credentials
      are encrypted and never stored by dav-worker.
    </p>

    <form method="POST" class="mt-8 flex flex-col gap-6">
      <input type="hidden" name="clientId" value={data.clientId} />
      <input type="hidden" name="redirectUri" value={data.redirectUri} />
      <input type="hidden" name="state" value={data.state} />
      <input type="hidden" name="codeChallenge" value={data.codeChallenge} />

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
        <FieldGroup
          icon={User}
          title="Connection"
          description="Your Nextcloud account details."
          fields={fields.slice(0, CONNECTION_FIELD_COUNT)}
        />
        <div class="md:border-l md:border-host-border-secondary md:pl-8">
          <FieldGroup
            icon={Settings}
            title="Configuration"
            description="Where dav-worker stores its config."
            fields={fields.slice(CONNECTION_FIELD_COUNT)}
          />
        </div>
      </div>

      <div
        class="flex justify-end gap-3 border-t border-host-border-secondary pt-6"
      >
        <Button
          type="button"
          variant="outline"
          onclick={() => (window.location.href = cancelUrl)}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          class="bg-host-accent-strong text-white hover:bg-host-accent"
        >
          Connect
        </Button>
      </div>
    </form>
  </Card>
</main>

<style>
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
</style>
