import { Router } from "express";
import express from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import {
	API_KEY_SCOPE_CATALOG,
	API_KEY_SCOPE_PRESETS,
	normalizeApiKeyScopes,
} from "@shared/api-key-scopes";
import type { Deps } from "./shared/deps";
import { asyncHandler } from "./shared/async-handler";
import { getRequestAuthUserId, requireSessionAuth } from "../auth";
import { db } from "../db";
import { apiKeys } from "@shared/schema";
import { generateApiKeyMaterial, hashSecret } from "../lib/sdk-auth";
import { resolveAccessibleSites } from "./shared/resolve-accessible-sites";

const DEFAULT_KEY_TTL_DAYS = 365;
const MAX_ACTIVE_KEYS = 25;

/**
 * API key management — dashboard session only (never Bearer API keys).
 * Keys are shown once on create; only the hash is stored.
 */
export function createApiKeysRoutes(deps: Deps): Router {
	const router = Router();

	router.use(express.json());
	router.use(requireSessionAuth);

	/** GET /scopes — scope catalog and presets for the create-key form. */
	router.get(
		"/scopes",
		asyncHandler(async (_req, res) => {
			res.json({
				catalog: API_KEY_SCOPE_CATALOG,
				presets: API_KEY_SCOPE_PRESETS,
			});
		}),
	);

	/** GET / — list active keys for the current user (prefix only, never full key). */
	router.get(
		"/",
		asyncHandler(async (req, res) => {
			const userId = getRequestAuthUserId(req);
			if (!userId) {
				return res.status(401).json({ message: "Unauthorized" });
			}

			const rows = await db
				.select({
					id: apiKeys.id,
					name: apiKeys.name,
					keyPrefix: apiKeys.keyPrefix,
					siteId: apiKeys.siteId,
					scopes: apiKeys.scopes,
					expiresAt: apiKeys.expiresAt,
					lastUsedAt: apiKeys.lastUsedAt,
					createdAt: apiKeys.createdAt,
				})
				.from(apiKeys)
				.where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
				.orderBy(desc(apiKeys.createdAt));

			res.json({
				keys: rows.map((row) => ({
					...row,
					scopes: normalizeApiKeyScopes(row.scopes),
				})),
				total: rows.length,
			});
		}),
	);

	/** POST / — create a new API key (returned once). */
	router.post(
		"/",
		asyncHandler(async (req, res) => {
			const userId = getRequestAuthUserId(req);
			if (!userId) {
				return res.status(401).json({ message: "Unauthorized" });
			}

			const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
			if (!name) {
				return res.status(400).json({ message: "Key name is required" });
			}

			const scopes = normalizeApiKeyScopes(req.body?.scopes);
			if (scopes.length === 0) {
				return res.status(400).json({ message: "Select at least one permission" });
			}

			const siteId =
				typeof req.body?.siteId === "string" ? req.body.siteId.trim() : "";

			if (!siteId) {
				return res.status(400).json({ message: "Select a site for this API key" });
			}

			const accessible = await resolveAccessibleSites({ models: deps.models, userId });
			if (!accessible.some((site) => site.id === siteId)) {
				return res.status(403).json({ message: "You do not have access to that site" });
			}

			const expiresInDays =
				typeof req.body?.expiresInDays === "number" && req.body.expiresInDays > 0
					? Math.min(req.body.expiresInDays, DEFAULT_KEY_TTL_DAYS)
					: DEFAULT_KEY_TTL_DAYS;

			const activeCount = await db
				.select({ id: apiKeys.id })
				.from(apiKeys)
				.where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)));

			if (activeCount.length >= MAX_ACTIVE_KEYS) {
				return res.status(400).json({ message: "Maximum active API keys reached" });
			}

			const { key, prefix } = generateApiKeyMaterial();
			const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

			const [record] = await db
				.insert(apiKeys)
				.values({
					name,
					keyPrefix: prefix,
					keyHash: hashSecret(key),
					userId,
					siteId,
					scopes,
					expiresAt,
				})
				.returning();

			res.status(201).json({
				key,
				id: record.id,
				name: record.name,
				keyPrefix: record.keyPrefix,
				siteId: record.siteId,
				scopes: normalizeApiKeyScopes(record.scopes),
				expiresAt: record.expiresAt,
				createdAt: record.createdAt,
			});
		}),
	);

	/** PATCH /:id — update scopes on an active API key. */
	router.patch(
		"/:id",
		asyncHandler(async (req, res) => {
			const userId = getRequestAuthUserId(req);
			if (!userId) {
				return res.status(401).json({ message: "Unauthorized" });
			}

			const scopes = normalizeApiKeyScopes(req.body?.scopes);
			if (scopes.length === 0) {
				return res.status(400).json({ message: "Select at least one permission" });
			}

			const [updated] = await db
				.update(apiKeys)
				.set({ scopes })
				.where(
					and(
						eq(apiKeys.id, req.params.id),
						eq(apiKeys.userId, userId),
						isNull(apiKeys.revokedAt),
					),
)
				.returning();

			if (!updated) {
				return res.status(404).json({ message: "API key not found" });
			}

			res.json({
				...updated,
				scopes: normalizeApiKeyScopes(updated.scopes),
			});
		}),
	);

	/** DELETE /:id — revoke an API key. */
	router.delete(
		"/:id",
		asyncHandler(async (req, res) => {
			const userId = getRequestAuthUserId(req);
			if (!userId) {
				return res.status(401).json({ message: "Unauthorized" });
			}

			const [updated] = await db
				.update(apiKeys)
				.set({ revokedAt: new Date() })
				.where(and(eq(apiKeys.id, req.params.id), eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
				.returning();

			if (!updated) {
				return res.status(404).json({ message: "API key not found" });
			}

			res.json({ message: "API key revoked", id: updated.id });
		}),
	);

	return router;
}
