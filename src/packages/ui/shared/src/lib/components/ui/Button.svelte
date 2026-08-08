<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";
  import { cva, type VariantProps } from "class-variance-authority";
  import { cn } from "$lib/utils.js";

  const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-host-ring-offset disabled:pointer-events-none disabled:opacity-50",
    {
      variants: {
        variant: {
          default: "bg-primary text-primary-foreground hover:bg-primary/90",
          destructive:
            "bg-destructive text-destructive-foreground hover:bg-destructive/90",
          outline:
            "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
          secondary:
            "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          ghost: "hover:bg-accent hover:text-accent-foreground",
          link: "text-primary underline-offset-4 hover:underline",
        },
        size: {
          default:
            "h-host-control-md px-host-control-px-md py-host-control-py-md",
          sm: "h-host-control-sm rounded-md px-host-control-px-sm",
          lg: "h-host-control-lg rounded-md px-host-control-px-lg",
          icon: "size-host-control-md",
        },
      },
      defaultVariants: {
        variant: "default",
        size: "default",
      },
    },
  );

  type Variant = VariantProps<typeof buttonVariants>["variant"];
  type Size = VariantProps<typeof buttonVariants>["size"];

  let {
    class: className,
    variant = "default" as Variant,
    size = "default" as Size,
    children,
    ...restProps
  }: HTMLButtonAttributes & {
    variant?: Variant;
    size?: Size;
    children?: Snippet;
  } = $props();
</script>

<button class={cn(buttonVariants({ variant, size, className }))} {...restProps}>
  {@render children?.()}
</button>
