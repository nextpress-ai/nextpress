import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	platform: "node",
	target: "node20",
	clean: true,
	outDir: "dist",
	sourcemap: true,
	dts: true,
	splitting: false,
	banner: {
		js: "#!/usr/bin/env node",
	},
	external: ["@nextpress-org/sdk", "@modelcontextprotocol/sdk"],
});
