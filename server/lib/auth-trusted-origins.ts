import { getAuthBaseUrl } from "../config";
import { models } from "../storage";
import { expandSiteUrlOrigins, getRequestSelfOrigin } from "./origin-utils";

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
 * Resolves Better Auth trusted origins from the request, env, and configured
 * site URLs.
 *
 * `request` is undefined during Better Auth initialization and `auth.api` calls
 * (e.g. the setup wizard's server-side signup); in that case only env + DB
 * origins apply. For real browser requests the request's own origin is trusted
 * when it is same-origin, so login works without any env config and survives
 * upgrades where the stored site URL no longer matches the live origin.
 */
export const resolveAuthTrustedOrigins = async (
	request?: Request,
): Promise<string[]> => {
	const origins = new Set<string>(getEnvTrustedOrigins());

	try {
		for (const origin of await getSiteTrustedOrigins()) {
			origins.add(origin);
		}
	} catch (error) {
		console.error("Auth trusted origins: site lookup failed:", error);
	}

	if (request) {
		const selfOrigin = getRequestSelfOrigin(request);
		if (selfOrigin) {
			origins.add(selfOrigin);
		}
	}

	return [...origins];
};
