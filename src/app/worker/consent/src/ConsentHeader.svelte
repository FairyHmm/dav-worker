<script lang="ts">
  import { LogoBadge } from "@dav-worker/ui-shared";
  import { ArrowLeftRight, Blocks } from "@lucide/svelte";
  import nextcloudIcon from "./assets/nextcloud-icon.svg";

  let { clientName, logoUri }: { clientName: string; logoUri?: string } =
    $props();

  // Client logo is self-asserted at registration (RFC 7591 logo_uri) —
  // never trusted identity, just falls back to a generic glyph if it
  // fails to load or wasn't provided.
  let clientLogoFailed = $state(false);
</script>

<div class="flex items-center justify-center gap-3 mb-6">
  <LogoBadge variant="plain" class="ring-1 ring-host-accent/30">
    <img src={nextcloudIcon} alt="" class="size-full" />
  </LogoBadge>
  <ArrowLeftRight class="size-4 text-host-accent shrink-0" />
  <LogoBadge>
    {#if logoUri && !clientLogoFailed}
      <img
        src={logoUri}
        alt=""
        class="size-full object-cover"
        onerror={() => (clientLogoFailed = true)}
      />
    {:else}
      <Blocks class="size-5 text-host-text-secondary" />
    {/if}
  </LogoBadge>
</div>

<h1
  class="text-host-lg font-medium leading-snug tracking-tight mb-3 text-center"
>
  {clientName} wants to connect
</h1>
