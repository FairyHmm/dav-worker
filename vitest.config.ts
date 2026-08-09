import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@dav-worker/mcp-utils": path.resolve(
        __dirname,
        "src/packages/tooling/mcp-utils/index.ts",
      ),
      "@dav-worker/time-utils": path.resolve(
        __dirname,
        "src/packages/tooling/time-utils/index.ts",
      ),
      "@dav-worker/batch-core": path.resolve(
        __dirname,
        "src/packages/batch/core/index.ts",
      ),
      "@dav-worker/calendar-ical": path.resolve(
        __dirname,
        "src/packages/calendar/ical/index.ts",
      ),
      "@dav-worker/calendar-contracts": path.resolve(
        __dirname,
        "src/packages/calendar/contracts/index.ts",
      ),
      "@dav-worker/calendar-tools": path.resolve(
        __dirname,
        "src/packages/calendar/tools/index.ts",
      ),
      "@dav-worker/clients-webdav": path.resolve(
        __dirname,
        "src/packages/clients/webdav/index.ts",
      ),
      "@dav-worker/files-contracts": path.resolve(
        __dirname,
        "src/packages/files/contracts/index.ts",
      ),
      "@dav-worker/files-tools": path.resolve(
        __dirname,
        "src/packages/files/tools/index.ts",
      ),
      "@dav-worker/files-types": path.resolve(
        __dirname,
        "src/packages/files/types/index.ts",
      ),
      "@dav-worker/storage-nextcloud": path.resolve(
        __dirname,
        "src/packages/storage/nextcloud/index.ts",
      ),
      "@dav-worker/task-contracts": path.resolve(
        __dirname,
        "src/packages/tasks/contracts/index.ts",
      ),
      "@dav-worker/task-tools": path.resolve(
        __dirname,
        "src/packages/tasks/tools/index.ts",
      ),
      "@dav-worker/auth-upstream": path.resolve(
        __dirname,
        "src/packages/auth/upstream/index.ts",
      ),
      "@dav-worker/config-parser": path.resolve(
        __dirname,
        "src/packages/config/parser/index.ts",
      ),
      "@dav-worker/files-locations": path.resolve(
        __dirname,
        "src/packages/files/locations/index.ts",
      ),
      "@dav-worker/files-parser": path.resolve(
        __dirname,
        "src/packages/files/parser/index.ts",
      ),
    },
  },
});
