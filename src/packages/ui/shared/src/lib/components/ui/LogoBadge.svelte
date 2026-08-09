<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { cva, type VariantProps } from "class-variance-authority";
  import { cn } from "$lib/utils.js";

  const logoBadgeVariants = cva(
    "flex size-11 items-center justify-center overflow-hidden rounded-host-lg border border-host-border-secondary",
    {
      variants: {
        variant: {
          plain: "",
          muted: "bg-host-bg-tertiary",
        },
      },
      defaultVariants: {
        variant: "muted",
      },
    },
  );

  type Variant = VariantProps<typeof logoBadgeVariants>["variant"];

  let {
    class: className,
    variant = "muted" as Variant,
    children,
    ...restProps
  }: HTMLAttributes<HTMLDivElement> & {
    variant?: Variant;
    children?: Snippet;
  } = $props();
</script>

<div class={cn(logoBadgeVariants({ variant, className }))} {...restProps}>
  {@render children?.()}
</div>
