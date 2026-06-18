import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const shouldPoll =
    process.env.CHOKIDAR_USEPOLLING === "true" ||
    process.env.VITE_POLLING === "true" ||
    process.env.WSL_DISTRO_NAME != null ||
    process.env.CONTAINER === "true" ||
    process.env.DOCKER === "true";

  const watch: Record<string, any> = {
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

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
