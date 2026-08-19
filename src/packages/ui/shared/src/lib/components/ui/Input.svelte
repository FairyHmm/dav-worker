<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";
  import { clsx } from "clsx";

  let {
    class: className,
    value = $bindable(),
    ...restProps
  }: HTMLInputAttributes & { value?: string | number } = $props();
</script>

<input
  class={clsx(
    "flex h-host-control-md w-full rounded-md border border-input bg-card px-host-control-px-sm py-host-control-py-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-host-ring-offset disabled:cursor-not-allowed disabled:opacity-50",
    className,
  )}
  bind:value
  {...restProps}
/>
