<script lang="ts">
  import { onMount } from "svelte";
  import { Button, Toast } from "@dav-worker/ui-shared";
  import { config } from "./utils/store.svelte";

  onMount(() => {
    config.load();
  });
</script>

<div id="config-root" class="relative min-h-screen p-4 pb-24">
  {#if config.loading}
    <p class="text-muted-foreground text-sm">Loading…</p>
  {:else if config.loadError}
    <p class="text-destructive text-sm">
      Failed to load config: {config.loadError}
    </p>
  {:else}
    <!-- Locations, Calendars, Tools sections go here -->
    <p class="text-muted-foreground text-sm">Sections coming next.</p>
  {/if}

  <!-- Save bar -->
  <div
    class="fixed bottom-0 left-0 right-0 flex items-center justify-end gap-3 border-t bg-card px-4 py-3"
  >
    {#if config.anyDirty}
      <span class="text-muted-foreground text-xs">Unsaved changes</span>
    {/if}
    <Button
      onclick={() => config.save()}
      disabled={!config.anyDirty || config.saving}
    >
      {config.saving ? "Saving…" : "Save"}
    </Button>
  </div>

  <Toast />
</div>
