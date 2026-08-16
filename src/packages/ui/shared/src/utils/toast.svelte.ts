/// <reference types="svelte" />

export type Toast = { kind: "success" | "error"; message: string };

class ToastStore {
  current = $state<Toast | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  show(kind: Toast["kind"], message: string) {
    clearTimeout(this.timer);
    this.current = { kind, message };
    this.timer = setTimeout(() => {
      this.current = null;
    }, 4000);
  }
}

export const toast = new ToastStore();
