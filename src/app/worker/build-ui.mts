import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { buildApps, type UiApp } from "@dav-worker/ui-shared/build-all";

const __dirname = dirname(fileURLToPath(import.meta.url));

const consent: UiApp = {
  name: "consent",
  dir: resolve(__dirname, "consent"),
  assetVarName: "consentHtml",
  buildCommand: {
    cmd: resolve(__dirname, "node_modules/.bin/vite"),
    args: ["build"],
  },
};

buildApps([consent]);
