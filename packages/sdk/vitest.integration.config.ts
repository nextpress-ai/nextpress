import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			"@nextpress-org/sdk": path.resolve(packageRoot, "dist/index.js"),
		},
	},
	test: {
		globals: true,
		environment: "node",
		include: ["src/test/integration/**/*.test.ts"],
		exclude: ["dist/**"],
		testTimeout: 120_000,
		hookTimeout: 120_000,
	},
});
