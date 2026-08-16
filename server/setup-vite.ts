import type { Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";
import { log } from "./vite";

/**
 * Dev-only Vite middleware. Loaded via `import(new URL(...))` from index.ts
 * so the production bundle never statically imports `vite`.
 */
export async function setupVite(app: Express, server: Server): Promise<void> {
	const { createServer: createViteServer, createLogger } = await import("vite");
	const { default: viteConfig } = await import("../vite.config");
	const viteLogger = createLogger();

	const shouldPoll =
		process.env.CHOKIDAR_USEPOLLING === "true" ||
		process.env.VITE_POLLING === "true" ||
		process.env.WSL_DISTRO_NAME != null ||
		process.env.CONTAINER === "true" ||
		process.env.DOCKER === "true";

	const watch: Record<string, unknown> = {
		ignored: ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**", "**/server/**"],
	};

	if (shouldPoll) {
		watch.usePolling = true;
		watch.interval = Number(process.env.VITE_POLL_INTERVAL ?? 300);
		watch.awaitWriteFinish = {
			stabilityThreshold: Number(process.env.VITE_AWF_STABILITY ?? 500),
			pollInterval: Number(process.env.VITE_AWF_POLL ?? 100),
		};
	}

	const serverOptions = {
		middlewareMode: true,
		// Share the HTTP server for HMR, but pin an explicit clientPort so the
		// injected Vite client connects to a defined port. Without this the client
		// can emit `ws://localhost:undefined` when port inference fails.
		hmr: { server, clientPort: parseInt(process.env.PORT || "5000", 10) },
		allowedHosts: true as const,
		watch,
	};

	const vite = await createViteServer({
		...viteConfig,
		configFile: false,
		customLogger: {
			...viteLogger,
			error: (msg, options) => {
				viteLogger.error(msg, options);
				process.exit(1);
			},
		},
		server: serverOptions,
		appType: "custom",
	});

	// Finish included dep pre-bundling before browser traffic — parallel requests
	// mid-optimize mix React chunk hashes and hooks throw (null dispatcher).
	log("Pre-bundling Vite dependencies…");
	await vite.transformRequest("/src/main.tsx");
	log("Vite dependency pre-bundle complete");

	app.use(vite.middlewares);
	app.use("*", async (req, res, next) => {
		const url = req.originalUrl;

		try {
			const clientTemplate = path.resolve(
				import.meta.dirname,
				"..",
				"client",
				"index.html",
			);

			let template = await fs.promises.readFile(clientTemplate, "utf-8");
			const page = await vite.transformIndexHtml(url, template);
			res.status(200).set({ "Content-Type": "text/html" }).end(page);
		} catch (e) {
			vite.ssrFixStacktrace(e as Error);
			next(e);
		}
	});
}
