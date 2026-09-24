import { Router } from "express";
import type { Deps } from "./shared/deps";
import { asyncHandler } from "./shared/async-handler";
import { createPluginInputSchema, pluginNameTaken } from "@shared/plugin-record";

const DEFAULT_PLUGIN_VERSION = "1.0.0";
const DEFAULT_PLUGIN_REQUIRES = "1.0.0";

function isPluginNameConflict(error: unknown): boolean {
	const raw = error instanceof Error ? error.message : String(error);
	return /plugins_name_unique|duplicate key.*plugins/i.test(raw);
}

/**
 * Plugin inventory: list, add, turn on or off, remove.
 * Mounted at `/api` so `/api/plugins` stays the same path the SDK already uses.
 */
export function createPluginsRoutes(deps: Deps) {
	const router = Router();
	const { models, requireAuth, authService, hooks } = deps;

	router.get(
		"/plugins",
		requireAuth,
		asyncHandler(async (_req, res) => {
			const plugins = await models.plugins.findMany();
			res.json(plugins);
		}),
	);

	router.post(
		"/plugins",
		requireAuth,
		asyncHandler(async (req, res) => {
			const userId = authService.getCurrentUserId(req);
			if (!userId) {
				return res.status(401).json({ message: "You must be signed in to add plugins." });
			}

			const parsed = createPluginInputSchema.safeParse(req.body);
			if (!parsed.success) {
				return res.status(400).json({ message: "Enter a name for the plugin." });
			}

			const existing = await models.plugins.findMany();
			if (pluginNameTaken({ name: parsed.data.name, existing: existing.map((row) => row.name) })) {
				return res.status(409).json({
					message: "A plugin with that name already exists. Choose a different name.",
					code: "PLUGIN_NAME_EXISTS",
				});
			}

			try {
				const plugin = await models.plugins.create({
					name: parsed.data.name,
					description: parsed.data.description || null,
					version: parsed.data.version ?? DEFAULT_PLUGIN_VERSION,
					runsWhen: parsed.data.runsWhen ?? "rendering",
					authorId: userId,
					status: "inactive",
					requires: DEFAULT_PLUGIN_REQUIRES,
				});
				res.status(201).json(plugin);
			} catch (error) {
				console.error("Error creating plugin:", {
					atFunction: "plugins.create",
					userId,
					error,
				});
				if (isPluginNameConflict(error)) {
					return res.status(409).json({
						message: "A plugin with that name already exists. Choose a different name.",
						code: "PLUGIN_NAME_EXISTS",
					});
				}
				throw error;
			}
		}),
	);

	router.post(
		"/plugins/:id/activate",
		requireAuth,
		asyncHandler(async (req, res) => {
			const plugin = await models.plugins.findById(req.params.id);
			if (!plugin) {
				return res.status(404).json({ message: "That plugin is gone. Refresh the list and try again." });
			}
			const updated = plugin.status === "active" ? plugin : await models.plugins.activate(plugin.id);
			hooks.doAction("activate_plugin", updated);
			res.json(updated);
		}),
	);

	router.post(
		"/plugins/:id/deactivate",
		requireAuth,
		asyncHandler(async (req, res) => {
			const plugin = await models.plugins.findById(req.params.id);
			if (!plugin) {
				return res.status(404).json({ message: "That plugin is gone. Refresh the list and try again." });
			}
			const updated = plugin.status === "inactive" ? plugin : await models.plugins.deactivate(plugin.id);
			hooks.doAction("deactivate_plugin", updated);
			res.json(updated);
		}),
	);

	router.delete(
		"/plugins/:id",
		requireAuth,
		asyncHandler(async (req, res) => {
			const plugin = await models.plugins.findById(req.params.id);
			if (!plugin) {
				return res.status(404).json({ message: "That plugin is gone. Refresh the list and try again." });
			}
			if (plugin.status === "active") {
				await models.plugins.deactivate(plugin.id);
				hooks.doAction("deactivate_plugin", { ...plugin, status: "inactive" });
			}
			await models.plugins.delete(plugin.id);
			res.status(204).send();
		}),
	);

	return router;
}
