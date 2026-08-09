<script lang="ts">
  import { Label, Input, Hint } from "@dav-worker/ui-shared";
  import type { Icon as IconType } from "@lucide/svelte";
  import type { ConsentField } from "./types";

  let {
    icon: Icon,
    title,
    description,
    fields,
  }: {
    icon: typeof IconType;
    title: string;
    description: string;
    fields: ConsentField[];
  } = $props();
</script>

<div class="flex flex-col gap-5">
  <div class="flex flex-col gap-1">
    <div class="flex items-center gap-2">
      <div
        class="flex size-6 shrink-0 items-center justify-center rounded-host-sm bg-host-accent-bg"
      >
        <Icon class="size-3.5 text-host-accent" />
      </div>
      <p class="text-host-md font-medium mb-0">{title}</p>
    </div>
    <p class="text-host-sm text-host-text-secondary leading-relaxed mb-0">
      {description}
    </p>
  </div>

  {#each fields as field}
    <div class="flex flex-col gap-1">
      <Label for={field.name}>{field.label}</Label>
      {#if field.description}
        <p class="text-host-xs text-host-text-secondary leading-relaxed mb-1">
          {field.description}
        </p>
      {/if}
      <Input
        type={field.type}
        name={field.name}
        placeholder={field.placeholder}
        bind:value={field.value}
        required={field.required}
        autocomplete={field.autocomplete}
        onblur={() => {
          if (field.normalize) field.value = field.normalize(field.value);
        }}
      />
      {#if field.hint}
        <Hint html={field.hint} />
      {/if}
    </div>
  {/each}
</div>
