import { cp } from "node:fs/promises";
import path from "node:path";
import { defineConfig } from "vitest/config";

const essentialsVendorDirectory = "vendor/milosapps-essentials/v1";

function preserveEssentialsVendor() {
  return {
    name: "gravity-loop-preserve-essentials-vendor",
    apply: "build" as const,
    async closeBundle(): Promise<void> {
      await cp(
        path.resolve(essentialsVendorDirectory),
        path.resolve("dist", essentialsVendorDirectory),
        { recursive: true },
      );
    },
  };
}

export default defineConfig({
  plugins: [preserveEssentialsVendor()],
  server: {
    host: "127.0.0.1",
    port: 4317,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 4317,
    strictPort: true,
  },
  build: {
    target: "es2022",
    sourcemap: true,
    // The public shell loads its theme and Shadow DOM stylesheets under a
    // strict `style-src 'self'` CSP. Keep even small CSS assets as same-origin
    // files instead of converting them to `data:` URLs in production builds.
    assetsInlineLimit: 0,
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"],
      include: ["src/core/**/*.ts", "src/storage.ts"],
    },
  },
});
