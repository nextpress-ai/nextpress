import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["src/test/live/**/*.live.test.ts"],
		exclude: ["dist/**"],
		testTimeout: 120_000,
		hookTimeout: 120_000,
	},
});
