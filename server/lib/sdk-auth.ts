import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { normalizeApiKeyScopes } from "@shared/api-key-scopes";
import { db } from "../db";
import { apiKeys, previewTokens } from "@shared/schema";

export type PreviewContentType = "page" | "post" | "template";

const API_KEY_PREFIX = "npk_live_";
const PREVIEW_TOKEN_PREFIX = "npt_";

/** Hashes a secret for storage — never persist raw keys or tokens. */
export function hashSecret(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

/** Generates a new API key string and its display prefix. */
export function generateApiKeyMaterial(): { key: string; prefix: string } {
	const randomPart = randomBytes(24).toString("base64url");
	const key = `${API_KEY_PREFIX}${randomPart}`;
	return { key, prefix: key.slice(0, 16) };
}

/** Generates a preview share token. */
export function generatePreviewTokenMaterial(): string {
	return `${PREVIEW_TOKEN_PREFIX}${randomBytes(24).toString("base64url")}`;
}

type VerifiedApiKey = {
	id: string;
	userId: string;
	siteId: string | null;
	scopes: string[];
};

/** Validates a Bearer API key and returns the owning user when active. */
export async function verifyApiKey(key: string): Promise<VerifiedApiKey | null> {
	if (!key.startsWith(API_KEY_PREFIX)) {
		return null;
	}

	const keyHash = hashSecret(key);
	const now = new Date();
	const rows = await db
		.select({
			id: apiKeys.id,
			userId: apiKeys.userId,
			siteId: apiKeys.siteId,
			scopes: apiKeys.scopes,
			expiresAt: apiKeys.expiresAt,
			revokedAt: apiKeys.revokedAt,
		})
		.from(apiKeys)
		.where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
		.limit(1);

	const record = rows[0];
	if (!record) {
		return null;
	}

	if (record.expiresAt && record.expiresAt <= now) {
		return null;
	}

	await db
		.update(apiKeys)
		.set({ lastUsedAt: now })
		.where(eq(apiKeys.id, record.id));

	return {
		id: record.id,
		userId: record.userId,
		siteId: record.siteId,
		scopes: normalizeApiKeyScopes(record.scopes),
	};
}

type VerifiedPreviewToken = {
	id: string;
	contentType: PreviewContentType;
	contentId: string;
	siteId: string | null;
	createdBy: string;
};

/** Validates a preview share token for the given content. */
export async function verifyPreviewToken({
	token,
	contentType,
	contentId,
}: {
	token: string;
	contentType: PreviewContentType;
	contentId: string;
}): Promise<VerifiedPreviewToken | null> {
	if (!token.startsWith(PREVIEW_TOKEN_PREFIX)) {
		return null;
	}

	const tokenHash = hashSecret(token);
	const now = new Date();
	const rows = await db
		.select()
		.from(previewTokens)
		.where(
			and(
				eq(previewTokens.tokenHash, tokenHash),
				eq(previewTokens.contentType, contentType),
				eq(previewTokens.contentId, contentId),
				gt(previewTokens.expiresAt, now),
			),
		)
		.limit(1);

	const record = rows[0];
	if (!record) {
		return null;
	}

	return {
		id: record.id,
		contentType: record.contentType as PreviewContentType,
		contentId: record.contentId,
		siteId: record.siteId,
		createdBy: record.createdBy,
	};
}

/** Persists a preview token hash with expiry (default 5 minutes). */
export async function createPreviewTokenRecord({
	token,
	contentType,
	contentId,
	siteId,
	createdBy,
	expiresAt,
}: {
	token: string;
	contentType: PreviewContentType;
	contentId: string;
	siteId?: string | null;
	createdBy: string;
	expiresAt: Date;
}): Promise<void> {
	await db.insert(previewTokens).values({
		tokenHash: hashSecret(token),
		contentType,
		contentId,
		siteId: siteId ?? null,
		createdBy,
		expiresAt,
	});
}

/** Removes expired preview tokens (best-effort housekeeping). */
export async function purgeExpiredPreviewTokens(): Promise<void> {
	await db.delete(previewTokens).where(lt(previewTokens.expiresAt, new Date()));
}
