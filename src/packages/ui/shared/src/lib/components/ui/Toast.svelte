<script lang="ts">
  import { toast } from "../../../utils/toast.svelte";
</script>

{#if toast.current}
  <div
    class="fixed bottom-16 right-4 rounded-md px-4 py-2 text-sm shadow-lg"
    class:bg-primary={toast.current.kind === "success"}
    class:text-primary-foreground={toast.current.kind === "success"}
    class:bg-destructive={toast.current.kind === "error"}
    class:text-destructive-foreground={toast.current.kind === "error"}
  >
    {toast.current.message}
  </div>
{/if}
