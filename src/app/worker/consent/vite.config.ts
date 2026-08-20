import { defineConfig } from "vite";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { defineUiConfig } from "@dav-worker/ui-shared/vite-base";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  defineUiConfig("consentHtml", { root: __dirname }),
);
