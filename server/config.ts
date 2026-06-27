/**
 * Configuration constants for NextPress CMS
 * Centralizes all hardcoded values for better maintainability
 */

import fs from "node:fs";
import path from "node:path";

export const CONFIG = {
	// Upload configuration
	UPLOAD: {
		LIMIT: 10 * 1024 * 1024, // 10MB
		ALLOWED_MIME_TYPES: [
			"image/jpeg",
			"image/jpg",
			"image/png",
			"image/gif",
			"image/webp",
			"image/svg+xml",
			"image/svg",
			"video/mp4",
			"video/webm",
			"audio/mp3",
			"audio/wav",
			"application/pdf",
			"text/plain",
		],
	},

	// Pagination defaults
	PAGINATION: {
		DEFAULT_PAGE_SIZE: 20,
		DEFAULT_POSTS_PER_PAGE: 10,
		DEFAULT_COMMENTS_PER_PAGE: 10,
		DEFAULT_MEDIA_PER_PAGE: 20,
		DEFAULT_TEMPLATES_PER_PAGE: 10,
		DEFAULT_BLOCKS_PER_PAGE: 10,
	},

	// Status values
	STATUS: {
		ANY: "any",
		PUBLISH: "publish",
		DRAFT: "draft",
		PRIVATE: "private",
		TRASH: "trash",
		PENDING: "pending",
		APPROVED: "approved",
		SPAM: "spam",
		ACTIVE: "active",
		INACTIVE: "inactive",
	},

	// User status values
	USER_STATUS: {
		ACTIVE: "active",
		INACTIVE: "inactive",
		PENDING: "pending",
	},

	// Comment status values
	COMMENT_STATUS: {
		APPROVED: "approved",
		PENDING: "pending",
		SPAM: "spam",
		TRASH: "trash",
	},

	// Site settings defaults
	SITE: {
		DEFAULT_NAME: "NextPress",
		DEFAULT_DESCRIPTION: "A modern WordPress alternative",
	},

	// Password hashing
	PASSWORD: {
		SALT_ROUNDS: 10,
	},

	// File upload
	FILE_UPLOAD: {
		// (removed UNIQUE_SUFFIX_LENGTH: 9, as it was unused and misleading)
	},
} as const;

/**
 * Optional ACME / Let's Encrypt contact email for Caddy (set in deployment env).
 * Prefer site `general.adminEmail` when present; this is a fallback when settings are not yet available.
 */
export function getOptionalCaddyAcmeEmail(): string | undefined {
	const raw = process.env.CADDY_ACME_EMAIL?.trim();
	return raw && raw.length > 0 ? raw : undefined;
}

/**
 * Better Auth base URL (public origin). Falls back to local dev URL.
 */
export function getAuthBaseUrl(): string {
	const fromEnv = process.env.BETTER_AUTH_URL?.trim();
	if (fromEnv && fromEnv.length > 0) {
		return fromEnv.replace(/\/+$/, "");
	}
	const port = process.env.PORT || "5000";
	return `http://localhost:${port}`;
}

/**
 * Better Auth signing secret. Reuses SESSION_SECRET when BETTER_AUTH_SECRET is unset.
 */
export function getAuthSecret(): string {
	const fromEnv = process.env.BETTER_AUTH_SECRET?.trim();
	if (fromEnv && fromEnv.length > 0) {
		return fromEnv;
	}
	const sessionSecret = process.env.SESSION_SECRET?.trim();
	if (sessionSecret && sessionSecret.length > 0) {
		return sessionSecret;
	}
	return "dev-better-auth-secret-change-in-production";
}

/**
 * Expected public IPv4 for domain verification (A records should include this).
 * Set in deployment when the app should confirm DNS points at this machine.
 */
export function getOptionalPublicIpv4(): string | undefined {
	const raw =
		process.env.PUBLIC_IPV4?.trim() ||
		process.env.SERVER_PUBLIC_IP?.trim();
	return raw && raw.length > 0 ? raw : undefined;
}

/**
 * Base URL to reach the Caddy reverse proxy from inside the app container (Host header probes).
 */
export function getCaddyInternalBaseUrl(): string {
	const raw = process.env.CADDY_INTERNAL_URL?.trim();
	if (raw && raw.length > 0) {
		return raw.replace(/\/$/, "");
	}
	return "http://caddy:80";
}

/**
 * Get site settings with defaults
 * @param req - Express request object
 * @returns Site settings object
 */
export function getSiteSettings(req: any) {
	return {
		name: CONFIG.SITE.DEFAULT_NAME,
		description: CONFIG.SITE.DEFAULT_DESCRIPTION,
		url: `${req.protocol}://${req.get("host")}`,
	};
}

/**
 * Parse pagination parameters with defaults
 * @param query - Query parameters object
 * @param defaultPageSize - Default page size
 * @returns Parsed pagination parameters
 */
export function parsePaginationParams(
	query: any,
	defaultPageSize: number = CONFIG.PAGINATION.DEFAULT_PAGE_SIZE,
) {
	const page = parseInt(query.page as string) || 1;
	const per_page = parseInt(query.per_page as string) || defaultPageSize;
	const limit = per_page;
	const offset = (page - 1) * limit;

	return { page, per_page, limit, offset };
}

/**
 * Handle status parameter with 'any' special case
 * @param status - Status parameter
 * @returns Actual status or undefined for 'any'
 */
export function parseStatusParam(
	status: string | undefined,
): string | undefined {
	return status === CONFIG.STATUS.ANY ? undefined : status;
}

/** App semver baked into package.json / config.ts. */
export function readInstalledAppVersion(): string {
	try {
		const packagePath = path.join(process.cwd(), "package.json");
		const raw = fs.readFileSync(packagePath, "utf8");
		const parsed = JSON.parse(raw) as { version?: string };
		if (typeof parsed.version === "string" && parsed.version.trim()) {
			return parsed.version.trim();
		}
	} catch {
		/* fall through */
	}
	return "0.0.0";
}

/** Production install directory for the nextpress CLI (`/opt/nextpress` by default). */
export function getNextpressInstallDir(): string | null {
	const raw = process.env.NEXTPRESS_INSTALL_DIR?.trim();
	if (raw && raw.length > 0) return raw;
	if (process.env.NODE_ENV === "production") return "/opt/nextpress";
	return null;
}

/** Opt-in flag — host must set this to allow POST /api/system/upgrade/run. */
export function getAutoUpgradeEnabled(): boolean {
	return process.env.NEXTPRESS_AUTO_UPGRADE?.trim() === "true";
}
