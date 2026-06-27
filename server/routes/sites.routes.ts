import { Router } from "express";
import { z } from "zod";
import type { Deps } from "./shared/deps";
import { asyncHandler } from "./shared/async-handler";
import { safeTryAsync } from "../utils";
import { resolveAccessibleSites } from "./shared/resolve-accessible-sites";
import { syncCaddyFromSites } from "../utils/caddy";

const createSiteSchema = z.object({
	name: z.string().min(1).max(200),
	siteUrl: z.string().nullable().optional(),
	description: z.string().nullable().optional(),
});

const updateSiteSchema = z.object({
	name: z.string().min(1).max(200).optional(),
	siteUrl: z.string().nullable().optional(),
	description: z.string().nullable().optional(),
	isDefault: z.boolean().optional(),
});

const toSiteListItem = (site: {
	id: string;
	name: string | null;
	siteUrl: string | null;
	isDefault: boolean | null;
}) => ({
	id: site.id,
	name: site.name ?? null,
	siteUrl: site.siteUrl ?? null,
	isDefault: site.isDefault ?? false,
});

/**
 * Multi-site list + CRUD routes.
 */
export function createSitesRoutes(deps: Deps): Router {
	const router = Router();
	const { models, requireAuth, authService } = deps;

	const assertSiteAccess = async (params: { userId: string; siteId: string }) => {
		const accessible = await resolveAccessibleSites({ models, userId: params.userId });
		if (!accessible.some((site) => site.id === params.siteId)) {
			throw new Error("Site not accessible");
		}
	};

	router.get(
		"/",
		requireAuth,
		asyncHandler(async (req, res) => {
			const userId = authService.getCurrentUserId(req);
			if (!userId) return res.status(401).json({ message: "Unauthorized" });

			const { err, result } = await safeTryAsync(async () => {
				const sites = await resolveAccessibleSites({ models, userId });
				return { sites, total: sites.length };
			});

			if (err || !result) {
				console.error("Error listing sites:", err);
				return res.status(500).json({ message: "Failed to list sites" });
			}

			res.json(result);
		}),
	);

	router.post(
		"/",
		requireAuth,
		asyncHandler(async (req, res) => {
			const userId = authService.getCurrentUserId(req);
			if (!userId) return res.status(401).json({ message: "Unauthorized" });

			const parsed = createSiteSchema.safeParse(req.body ?? {});
			if (!parsed.success) {
				return res.status(400).json({ message: "Invalid site data", errors: parsed.error.errors });
			}

			const { err, result } = await safeTryAsync(async () => {
				const site = await models.sites.create({
					name: parsed.data.name,
					siteUrl: parsed.data.siteUrl ?? null,
					description: parsed.data.description ?? null,
					ownerId: userId,
					isDefault: false,
				});

				const adminRole = await models.roles.findByName("admin");
				if (adminRole) {
					await models.userRoles.assignRole(userId, adminRole.id, site.id);
				}

				if (parsed.data.siteUrl) {
					await syncCaddyFromSites({ models });
				}

				return { site: toSiteListItem(site) };
			});

			if (err) {
				console.error("Error creating site:", err);
				return res.status(500).json({ message: "Failed to create site" });
			}

			res.status(201).json(result);
		}),
	);

	router.get(
		"/:id",
		requireAuth,
		asyncHandler(async (req, res) => {
			const userId = authService.getCurrentUserId(req);
			if (!userId) return res.status(401).json({ message: "Unauthorized" });

			const { err, result } = await safeTryAsync(async () => {
				await assertSiteAccess({ userId, siteId: req.params.id });
				const site = await models.sites.findById(req.params.id);
				if (!site) throw new Error("Site not found");
				return { site: toSiteListItem(site) };
			});

			if (err) {
				const message = err instanceof Error ? err.message : "Failed to fetch site";
				const status =
					message === "Site not accessible" ? 403 : message === "Site not found" ? 404 : 500;
				return res.status(status).json({ message });
			}

			res.json(result);
		}),
	);

	router.patch(
		"/:id",
		requireAuth,
		asyncHandler(async (req, res) => {
			const userId = authService.getCurrentUserId(req);
			if (!userId) return res.status(401).json({ message: "Unauthorized" });

			const parsed = updateSiteSchema.safeParse(req.body ?? {});
			if (!parsed.success) {
				return res.status(400).json({ message: "Invalid site data", errors: parsed.error.errors });
			}

			const { err, result } = await safeTryAsync(async () => {
				await assertSiteAccess({ userId, siteId: req.params.id });
				const site = await models.sites.findById(req.params.id);
				if (!site) throw new Error("Site not found");

				if (parsed.data.isDefault === true) {
					const allSites = await models.sites.findMany();
					for (const other of allSites) {
						if (other.id === site.id) continue;
						await models.sites.update(other.id, { isDefault: false, updatedAt: new Date() });
					}
				}

				const updated = await models.sites.update(site.id, {
					...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
					...(parsed.data.siteUrl !== undefined ? { siteUrl: parsed.data.siteUrl } : {}),
					...(parsed.data.description !== undefined
						? { description: parsed.data.description }
						: {}),
					...(parsed.data.isDefault !== undefined ? { isDefault: parsed.data.isDefault } : {}),
					updatedAt: new Date(),
				});

				if (parsed.data.siteUrl !== undefined) {
					await syncCaddyFromSites({ models });
				}

				return { site: toSiteListItem(updated ?? site) };
			});

			if (err) {
				const message = err instanceof Error ? err.message : "Failed to update site";
				const status =
					message === "Site not accessible" ? 403 : message === "Site not found" ? 404 : 500;
				return res.status(status).json({ message });
			}

			res.json(result);
		}),
	);

	router.delete(
		"/:id",
		requireAuth,
		asyncHandler(async (req, res) => {
			const userId = authService.getCurrentUserId(req);
			if (!userId) return res.status(401).json({ message: "Unauthorized" });

			const { err, result } = await safeTryAsync(async () => {
				await assertSiteAccess({ userId, siteId: req.params.id });
				const site = await models.sites.findById(req.params.id);
				if (!site) throw new Error("Site not found");
				if (site.isDefault) {
					throw new Error("Cannot delete the default site");
				}

				await models.sites.delete(site.id);
				await syncCaddyFromSites({ models });
				return { status: true };
			});

			if (err) {
				const message = err instanceof Error ? err.message : "Failed to delete site";
				const status =
					message === "Site not accessible"
						? 403
						: message === "Site not found"
							? 404
							: message === "Cannot delete the default site"
								? 400
								: 500;
				return res.status(status).json({ message });
			}

			res.json(result);
		}),
	);

	return router;
}
