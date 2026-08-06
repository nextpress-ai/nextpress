import { Router } from "express";
import type { Deps } from "./shared/deps";
import { asyncHandler } from "./shared/async-handler";
import { safeTryAsync } from "../utils";
import path from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { enrichPostForApi } from "@shared/posts/post-other";
import { resolveSiteRenderContext } from "./shared/resolve-site-render-context";
import { getSiteBlogIds } from "./shared/site-content";
import { buildPublishedPageHtml } from "./shared/build-published-page-html";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Creates HTML rendering routes for posts, pages, and home.
 * These routes serve server-rendered HTML content using the active theme.
 *
 * Endpoints:
 * - GET /posts/:id - Render single post by ID as HTML
 * - GET /pages/:id - Render single page by ID as HTML
 * - GET /home - Render homepage with recent published posts
 *
 * All routes use themeManager to render content with the active theme.
 * Returns 404 page if content not found or rendering fails.
 *
 * @param deps - Injected dependencies (models, themeManager, getSiteSettings)
 * @returns Express router with mounted render routes
 */
export function createRenderRoutes(deps: Deps): Router {
	const router = Router();
	const { models, themeManager } = deps;

	/**
	 * GET /renderer/scripts/hydrate.js - Serve hydration script
	 */
	router.get("/renderer/scripts/hydrate.js", (_req, res) => {
		try {
			const scriptPath = path.join(
				__dirname,
				"../../renderer/scripts/hydrate.js",
			);
			const script = readFileSync(scriptPath, "utf-8");
			res.setHeader("Content-Type", "application/javascript");
			res.send(script);
		} catch (error) {
			console.error("Error serving hydrate.js:", error);
			res.status(500).send("// Error loading hydration script");
		}
	});

	/**
	 * GET /renderer/react/block-components.js - Serve block components ESM
	 * This is a simplified version that exports the component registry
	 */
	router.get("/renderer/react/block-components.js", (_req, res) => {
		try {
			// For now, return a stub that imports from CDN
			// In production, this should be a bundled version of the components
			const stub = `
        // Block components stub - components are server-rendered
        // This is a placeholder for client-side hydration
        export const BLOCK_COMPONENTS = {};
      `;
			res.setHeader("Content-Type", "application/javascript");
			res.send(stub);
		} catch (error) {
			console.error("Error serving block-components.js:", error);
			res.status(500).send("// Error loading block components");
		}
	});

	/**
	 * GET /robots.txt - Serve robots.txt with sensible defaults
	 * References site URL for sitemap location
	 */
	router.get("/robots.txt", asyncHandler(async (req, res) => {
		const context = await resolveSiteRenderContext({ models, req });
		const siteUrl = context?.settings.url || `${req.protocol}://${req.get("host")}`;

		const lines: string[] = [
			"User-agent: *",
			"Disallow: /admin",
			"Disallow: /api",
			"",
			`Sitemap: ${siteUrl}/sitemap.xml`,
		];

		res.setHeader("Content-Type", "text/plain");
		res.send(lines.join("\n"));
	}));

	/**
	 * GET /posts/:id - Render single post as HTML
	 * Uses 'single-post' template from active theme
	 */
	router.get(
		"/posts/:id",
		asyncHandler(async (req, res) => {
			const { err } = await safeTryAsync(async () => {
				const context = await resolveSiteRenderContext({ models, req });
				if (!context) {
					const html = themeManager.render404();
					return res.status(404).send(html);
				}

				const postId = req.params.id;
				const post = await models.posts.findById(postId);

				if (!post) {
					const html = themeManager.render404();
					return res.status(404).send(html);
				}

				const blogIds = await getSiteBlogIds({ models, siteId: context.site.id });
				if (!post.blogId || !blogIds.includes(post.blogId)) {
					const html = themeManager.render404();
					return res.status(404).send(html);
				}

				const html = await themeManager.renderContent("single-post", {
					post: enrichPostForApi(post),
					site: context.settings,
				});

				res.setHeader("Content-Type", "text/html");
				res.send(html);
			});

			if (err) {
				console.error("Error rendering post:", err);
				const html = themeManager.render404();
				res.status(500).send(html);
			}
		}),
	);

	/**
	 * GET /pages/:id - Render single page as HTML
	 * Uses 'page' template from active theme
	 * Pages use same storage as posts
	 */
	router.get(
		"/pages/:id",
		asyncHandler(async (req, res) => {
			const { err } = await safeTryAsync(async () => {
				const context = await resolveSiteRenderContext({ models, req });
				if (!context) {
					const html = themeManager.render404();
					return res.status(404).send(html);
				}

				const pageId = req.params.id;
				const page = await models.pages.findById(pageId);

				if (!page || page.siteId !== context.site.id) {
					const html = themeManager.render404();
					return res.status(404).send(html);
				}

				const html = buildPublishedPageHtml({
					page,
					canonicalUrl: `${req.protocol}://${req.get("host")}/pages/${page.id}`,
				});

				res.setHeader("Content-Type", "text/html");
				res.send(html);
			});

			if (err) {
				console.error("Error rendering page:", err);
				const html = themeManager.render404();
				res.status(500).send(html);
			}
		}),
	);

	/**
	 * GET /home - Render homepage with recent published posts
	 * Uses 'home' template from active theme
	 * Fetches up to 10 most recent published posts
	 */
	router.get(
		"/home",
		asyncHandler(async (req, res) => {
			const { err } = await safeTryAsync(async () => {
				const context = await resolveSiteRenderContext({ models, req });
				if (!context) {
					const html = themeManager.render404();
					return res.status(404).send(html);
				}

				const blogIds = await getSiteBlogIds({ models, siteId: context.site.id });
				const posts =
					blogIds.length > 0
						? await models.posts.findManyWhere(
								[
									{ where: "status", equals: "publish" },
									{ where: "blogId", in: blogIds },
								],
								{ limit: 10 },
							)
						: [];

				const html = await themeManager.renderContent("home", {
					posts: posts.map(enrichPostForApi),
					site: context.settings,
				});

				res.setHeader("Content-Type", "text/html");
				res.send(html);
			});

			if (err) {
				console.error("Error rendering home:", err);
				const html = themeManager.render404();
				res.status(500).send(html);
			}
		}),
	);

	/**
	 * GET /sites/:siteId/:pageSlug - Retrieve page by site ID and page slug
	 * Phase 1: Retrieves and logs blocks to console (rendering in Phase 2)
	 */
	router.get(
		"/sites/:siteId/:pageSlug",
		asyncHandler(async (req, res) => {
			const { err } = await safeTryAsync(async () => {
				const { siteId, pageSlug } = req.params;

				// 1. Validate siteId format (should be UUID)
				const isUUID =
					/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
						siteId,
					);
				if (!isUUID) {
					res.status(400).json({ message: "Invalid site ID format" });
					return;
				}

				// 2. Find site by ID
				const { err: siteErr, result: site } = await safeTryAsync(async () => {
					return await models.sites.findById(siteId);
				});

				if (siteErr) {
					console.error("Error finding site:", siteErr);
					res.status(500).json({ message: "Error looking up site" });
					return;
				}

				if (!site) {
					console.error(`Site not found with ID: ${siteId}`);
					// Try to list all sites to help debug
					const { result: allSites } = await safeTryAsync(async () => {
						return await models.sites.findMany();
					});
					if (allSites && allSites.length > 0) {
						const sitesList = allSites
							.map(
								(s: { id: string; name?: string | null }) =>
									`{id: ${s.id}, name: ${s.name || "N/A"}}`,
							)
							.join(", ");
						console.log(`Available sites (${allSites.length}):`, sitesList);
						// Also try to get default site
						const { result: defaultSite } = await safeTryAsync(async () => {
							return await models.sites.findDefaultSite();
						});
						if (defaultSite) {
							console.log(`Default site ID: ${defaultSite.id}`);
						}
					} else {
						console.log("No sites found in database");
					}
					res.status(404).json({
						message: "Site not found",
						requestedSiteId: siteId,
						hint: "Check server logs for available site IDs",
					});
					return;
				}

				// 3. Find page by siteId and slug
				const page = await models.pages.findBySiteAndSlug(siteId, pageSlug);
				if (!page) {
					res.status(404).json({ message: "Page not found" });
					return;
				}

				// 4. Only allow published pages for public access
				if (page.status !== "publish") {
					res.status(404).json({ message: "Page not found" });
					return;
				}

				const html = buildPublishedPageHtml({
					page,
					canonicalUrl: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
				});

				res.setHeader("Content-Type", "text/html");
				res.send(html);
			});

			if (err) {
				console.error("Error retrieving page:", err);
				if (!res.headersSent) {
					res.status(500).json({ message: "Failed to retrieve page" });
				}
			}
		}),
	);

	return router;
}
