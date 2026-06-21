/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
	plugins: [react()],
	test: {
		globals: true,
		projects: [
			{
				extends: true,
				test: {
					name: "client",
					environment: "jsdom",
					setupFiles: ["./client/src/test/setup.ts"],
					include: [
						"client/src/**/*.test.{ts,tsx}",
						"client/src/**/*.spec.{ts,tsx}",
					],
					exclude: ["node_modules", "dist", "build", "**/*.e2e.{ts,tsx}"],
				},
			},
			{
				extends: true,
				test: {
					name: "server",
					environment: "node",
					setupFiles: ["./server/test/setup.ts"],
					include: [
						"server/test/**/*.test.{ts,tsx}",
						"server/test/**/*.spec.{ts,tsx}",
					],
					exclude: ["node_modules", "dist", "build", "**/*.e2e.{ts,tsx}"],
				},
			},
			{
				extends: true,
				test: {
					name: "shared",
					environment: "node",
					include: [
						"shared/**/*.test.{ts,tsx}",
						"shared/**/*.spec.{ts,tsx}",
					],
					exclude: ["node_modules", "dist", "build", "**/*.e2e.{ts,tsx}"],
				},
			},
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			include: ["client/src/**/*.{ts,tsx}"],
			exclude: [
				"client/src/**/*.test.{ts,tsx}",
				"client/src/**/*.spec.{ts,tsx}",
				"client/src/test/**/*",
				"client/src/main.tsx",
				"client/src/index.css",
			],
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./client/src"),
			"@shared": path.resolve(__dirname, "./shared"),
		},
	},
});
