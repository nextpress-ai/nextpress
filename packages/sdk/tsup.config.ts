import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	platform: "neutral",
	target: "es2022",
	clean: true,
	outDir: "dist",
	sourcemap: true,
	dts: true,
	splitting: false,
});
