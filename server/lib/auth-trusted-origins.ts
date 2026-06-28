import { getAuthBaseUrl } from "../config";
import { models } from "../storage";
import {
	getCaddyTlsHostnames,
	shouldSkipPublicDnsCheck,
} from "../utils/validate-domain";

/** Builds origin strings (scheme + host) for a stored site URL and its TLS hostnames. */
const expandSiteUrlOrigins = (siteUrl: string): string[] => {
	const trimmed = siteUrl.trim();
	if (!trimmed) return [];

	try {
		const parsed = new URL(
			trimmed.startsWith("http://") || trimmed.startsWith("https://")
				? trimmed
				: `https://${trimmed}`,
		);
		const origins = new Set<string>();
		const addOrigin = (scheme: string, host: string): void => {
			origins.add(`${scheme}//${host}`);
		};

		addOrigin(parsed.protocol, parsed.host);

		for (const host of getCaddyTlsHostnames(trimmed)) {
			addOrigin(parsed.protocol, host);
			if (shouldSkipPublicDnsCheck(host)) {
				addOrigin("http:", host);
				if (parsed.port) {
					addOrigin("http:", `${host}:${parsed.port}`);
				}
			}
		}

		return [...origins];
	} catch {
		return [];
	}
};

/** Origins from deployment env (BETTER_AUTH_URL, SITE_URL). */
const getEnvTrustedOrigins = (): string[] => {
	const origins = new Set<string>();
	origins.add(getAuthBaseUrl());

	const siteUrl = process.env.SITE_URL?.trim();
	if (siteUrl) {
		for (const origin of expandSiteUrlOrigins(siteUrl)) {
			origins.add(origin);
		}
	}

	return [...origins];
};

let cachedSiteOrigins: { at: number; origins: string[] } | null = null;
const SITE_ORIGIN_CACHE_MS = 60_000;

/** Site URLs configured during setup / in admin settings. */
const getSiteTrustedOrigins = async (): Promise<string[]> => {
	const now = Date.now();
	if (cachedSiteOrigins && now - cachedSiteOrigins.at < SITE_ORIGIN_CACHE_MS) {
		return cachedSiteOrigins.origins;
	}

	const origins = new Set<string>();
	const sites = await models.sites.findMany();
	for (const site of sites) {
		const siteUrl = site.siteUrl?.trim();
		if (!siteUrl) continue;
		for (const origin of expandSiteUrlOrigins(siteUrl)) {
			origins.add(origin);
		}
	}

	const list = [...origins];
	cachedSiteOrigins = { at: now, origins: list };
	return list;
};

/**
 * Resolves Better Auth trusted origins from env and configured site URLs.
 * Without this, prod login fails when BETTER_AUTH_URL is unset (defaults to localhost).
 */
export const resolveAuthTrustedOrigins = async (): Promise<string[]> => {
	const origins = new Set<string>(getEnvTrustedOrigins());

	try {
		for (const origin of await getSiteTrustedOrigins()) {
			origins.add(origin);
		}
	} catch (error) {
		console.error("Auth trusted origins: site lookup failed:", error);
	}

	return [...origins];
};
