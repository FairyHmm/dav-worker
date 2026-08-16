import {
  CONFIG_SECTIONS,
  createEmptySections,
  type ConfigSection,
  type ConfigSections,
} from "@dav-worker/config-parser";
import { toast } from "@dav-worker/ui-shared";
import { getSection, setSection } from "./mcp";

function emptySaved(): Record<ConfigSection, string> {
  return Object.fromEntries(
    CONFIG_SECTIONS.map((key) => [key, ""]),
  ) as Record<ConfigSection, string>;
}

class ConfigStore {
  sections = $state<ConfigSections>(createEmptySections());

  // JSON snapshots of the last-saved sections for dirty detection
  saved = $state<Record<ConfigSection, string>>(emptySaved());

  loading = $state(true);
  loadError = $state<string | null>(null);
  saving = $state(false);

  get dirty() {
    return CONFIG_SECTIONS.map((key) => ({
      key,
      dirty: JSON.stringify(this.sections[key]) !== this.saved[key],
    }));
  }

  get anyDirty() {
    return this.dirty.some((s) => s.dirty);
  }

  private snapshot() {
    CONFIG_SECTIONS.forEach((key) => {
      this.saved[key] = JSON.stringify(this.sections[key]);
    });
  }

  async load() {
    this.loading = true;
    this.loadError = null;
    try {
      const values = await Promise.all(
        CONFIG_SECTIONS.map((key) => getSection(key)),
      );
      const loaded = Object.fromEntries(
        CONFIG_SECTIONS.map((key, i) => [key, values[i]]),
      ) as unknown as ConfigSections;
      this.sections = loaded;
      this.snapshot();
    } catch (e) {
      this.loadError = e instanceof Error ? e.message : String(e);
    } finally {
      this.loading = false;
    }
  }

  async save() {
    this.saving = true;
    try {
      // Sequential: config_set replaces one section at a time, and the
      // `disabled` write must land after the others (SPEC-UI-CONFIG.md).
      for (const { key, dirty } of this.dirty) {
        if (!dirty) continue;
        await setSection(
          key,
          this.sections[key] as unknown as Record<string, unknown>,
        );
      }
      this.snapshot();
      toast.show("success", "Settings saved");
    } catch (e) {
      toast.show("error", e instanceof Error ? e.message : String(e));
    } finally {
      this.saving = false;
    }
  }
}

export const config = new ConfigStore();
