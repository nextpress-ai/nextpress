import { defineConfig } from "vite";
import path from "path";

const projectRoot = import.meta.dirname;
const clientRoot = path.resolve(projectRoot, "client");
const outDir = path.resolve(clientRoot, "public/assets/css");

/** Builds a stable bundled-fonts.css (+ woff2 siblings) for SSR HTML shell. */
export default defineConfig({
	root: clientRoot,
	base: "./",
	publicDir: false,
	resolve: {
		alias: {
			"@": path.resolve(clientRoot, "src"),
			"@shared": path.resolve(projectRoot, "shared"),
		},
	},
	build: {
		outDir,
		emptyOutDir: true,
		cssCodeSplit: false,
		rollupOptions: {
			input: path.resolve(clientRoot, "src/styles/bundled-fonts-entry.ts"),
			output: {
				assetFileNames: "bundled-fonts[extname]",
			},
		},
	},
	css: {
		postcss: {
			plugins: [],
		},
	},
});
