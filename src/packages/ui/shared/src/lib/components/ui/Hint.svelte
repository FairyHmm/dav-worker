<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { clsx } from "clsx";

  let {
    class: className,
    html,
    ...restProps
  }: HTMLAttributes<HTMLParagraphElement> & { html: string } = $props();
</script>

<p
  class={clsx(
    "text-host-sm text-host-text-tertiary leading-snug mt-1 mb-0",
    className,
  )}
  {...restProps}
>
  {@html html}
</p>

<style>
  p :global(code) {
    background: var(--color-host-bg);
    border-radius: var(--radius-host-xs);
    padding: 0 0.2em;
  }

  p :global(a) {
    color: var(--color-host-info-text);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  p :global(a:hover) {
    text-decoration-thickness: 2px;
  }
</style>
