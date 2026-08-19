import { defineConfig } from "vite";
import { defineUiConfig } from "@dav-worker/ui-shared/vite-base";

export default defineConfig(defineUiConfig("configHtml"));
