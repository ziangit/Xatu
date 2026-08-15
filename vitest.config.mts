import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * The only thing vitest needs from us: the `@/…` alias tsconfig gives the app,
 * so a module under `app/` that imports `@/lib/…` can be unit-tested. Test
 * discovery is left at the defaults (`**\/*.test.ts`), which is what the suite
 * already relied on.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
