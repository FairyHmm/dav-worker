<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLLabelAttributes } from "svelte/elements";
  import { clsx } from "clsx";

  let {
    class: className,
    children,
    ...restProps
  }: HTMLLabelAttributes & { children?: Snippet } = $props();
</script>

<label
  class={clsx(
    "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
    className,
  )}
  {...restProps}
>
  {@render children?.()}
</label>
