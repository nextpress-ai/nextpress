import { Router } from "express";
import type { Request, Response } from "express";
import type { Deps } from "./shared/deps";
import { asyncHandler } from "./shared/async-handler";
import { safeTryAsync } from "../utils";
import path from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { resolveSiteRenderContext } from "./shared/resolve-site-render-context";
import { getSiteBlogIds } from "./shared/site-content";
import { renderStatusHtml } from "../../renderer/templates/status-page";
import { isPubliclyReadable } from "../lib/is-publicly-readable";
import { sendPublishedHtml } from "../lib/send-published-html";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sendStatusPage({
	req,
	res,
	status,
}: {
	req: Request;
	res: Response;
	status: 404 | 500;
}): void {
	const title = status === 404 ? "Page not found" : "Something went wrong";
	const message =
		status === 404
			? "This page is not available."
			: "The page could not be loaded.";
	const html = renderStatusHtml({
		status,
		title,
		message,
		canonicalUrl: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
	});
	res.status(status);
	res.setHeader("Content-Type", "text/html");
	res.send(html);
}

/**
 * Creates HTML rendering routes for posts, pages, and home.
 * Published HTML uses `buildPublishedPageHtml` (page-builder blocks).
 */
export function createRenderRoutes(deps: Deps): Router {
	const router = Router();
	const { models } = deps;

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
	 * GET /posts/:id - Render a post with the same block pipeline as published pages.
	 */
	router.get(
		"/posts/:id",
		asyncHandler(async (req, res) => {
			const { err } = await safeTryAsync(async () => {
				const context = await resolveSiteRenderContext({ models, req });
				if (!context) {
					return sendStatusPage({ req, res, status: 404 });
				}

				const postId = req.params.id;
				const post = await models.posts.findById(postId);

				if (!post || !isPubliclyReadable(post)) {
					return sendStatusPage({ req, res, status: 404 });
				}

				const blogIds = await getSiteBlogIds({ models, siteId: context.site.id });
				if (!post.blogId || !blogIds.includes(post.blogId)) {
					return sendStatusPage({ req, res, status: 404 });
				}

				await sendPublishedHtml({
					res,
					models,
					document: post,
					canonicalUrl: `${req.protocol}://${req.get("host")}/posts/${post.id}`,
				});
			});

			if (err) {
				console.error("Error rendering post:", err);
				sendStatusPage({ req, res, status: 500 });
			}
		}),
	);

	/**
	 * GET /pages/:id - Render a page with the same block pipeline as published pages.
	 */
	router.get(
		"/pages/:id",
		asyncHandler(async (req, res) => {
			const { err } = await safeTryAsync(async () => {
				const context = await resolveSiteRenderContext({ models, req });
				if (!context) {
					return sendStatusPage({ req, res, status: 404 });
				}

				const pageId = req.params.id;
				const page = await models.pages.findById(pageId);

				if (page && page.siteId === context.site.id) {
					if (!isPubliclyReadable(page)) {
						return sendStatusPage({ req, res, status: 404 });
					}
					await sendPublishedHtml({
						res,
						models,
						document: page,
						canonicalUrl: `${req.protocol}://${req.get("host")}/pages/${page.id}`,
					});
					return;
				}

				const post = await models.posts.findById(pageId);
				if (!post || !isPubliclyReadable(post)) {
					return sendStatusPage({ req, res, status: 404 });
				}
				const blogIds = await getSiteBlogIds({ models, siteId: context.site.id });
				if (!post.blogId || !blogIds.includes(post.blogId)) {
					return sendStatusPage({ req, res, status: 404 });
				}
				await sendPublishedHtml({
					res,
					models,
					document: post,
					canonicalUrl: `${req.protocol}://${req.get("host")}/pages/${post.id}`,
				});
			});

			if (err) {
				console.error("Error rendering page:", err);
				sendStatusPage({ req, res, status: 500 });
			}
		}),
	);

	/**
	 * GET /home - Render the site homepage page (same document as `/api/public/homepage`).
	 */
	router.get(
		"/home",
		asyncHandler(async (req, res) => {
			const { err } = await safeTryAsync(async () => {
				const context = await resolveSiteRenderContext({ models, req });
				if (!context) {
					return sendStatusPage({ req, res, status: 404 });
				}

				const homepage = await models.options.getOption("homepage_page_slug", context.site.id);
				if (!homepage?.value) {
					return sendStatusPage({ req, res, status: 404 });
				}

				const page = await models.pages.findBySiteAndSlug(context.site.id, homepage.value);
				if (!page || !isPubliclyReadable(page)) {
					return sendStatusPage({ req, res, status: 404 });
				}

				await sendPublishedHtml({
					res,
					models,
					document: page,
					canonicalUrl: `${req.protocol}://${req.get("host")}/`,
				});
			});

			if (err) {
				console.error("Error rendering home:", err);
				sendStatusPage({ req, res, status: 500 });
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
				if (!page || !isPubliclyReadable(page)) {
					res.status(404).json({ message: "Page not found" });
					return;
				}

				await sendPublishedHtml({
					res,
					models,
					document: page,
					canonicalUrl: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
				});
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
