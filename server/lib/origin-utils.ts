import {
	getCaddyTlsHostnames,
	normalizeSiteHostname,
} from "../utils/validate-domain";

/**
 * Builds trusted origin strings (scheme + host) for a stored site URL and its
 * TLS hostnames.
 *
 * Each host is expanded to BOTH http and https. Upgraded instances frequently
 * stored `siteUrl` with the wrong scheme (e.g. `http://` while Caddy now serves
 * `https://`); trusting both schemes makes origin matching scheme-agnostic.
 */
export const expandSiteUrlOrigins = (siteUrl: string): string[] => {
	const trimmed = siteUrl.trim();
	if (!trimmed) return [];

	const origins = new Set<string>();
	const addBothSchemes = (host: string): void => {
		if (!host) return;
		origins.add(`https://${host}`);
		origins.add(`http://${host}`);
	};

	const hosts = getCaddyTlsHostnames(trimmed);
	if (hosts.length === 0) {
		addBothSchemes(normalizeSiteHostname(trimmed));
	}
	for (const host of hosts) {
		addBothSchemes(host);
	}

	return [...origins];
};

/**
 * Reads the host the request was actually sent to.
 *
 * Prefers the real `Host` header: it is set by the connecting browser to the
 * domain it reached and cannot be forged cross-site, which is what makes the
 * same-origin check CSRF-safe. Caddy preserves the public Host by default.
 * `X-Forwarded-Host` is only a fallback for proxies that rewrite Host to an
 * internal upstream; it is untrusted otherwise.
 */
export const getRequestHost = (request: Request): string => {
	const host =
		request.headers.get("host") ||
		request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
	return host?.trim().toLowerCase() ?? "";
};

/**
 * Derives the origin to trust from an inbound browser request.
 *
 * CSRF-safe same-origin check: trust the request's `Origin` only when its host
 * equals the host the proxy is serving (`Host` / `X-Forwarded-Host`). A
 * cross-site forgery carries the attacker's Origin but the victim's Host, so it
 * never matches. Needs no env or DB row, which keeps upgraded instances working.
 */
export const getRequestSelfOrigin = (request: Request): string | null => {
	const originHeader = request.headers.get("origin")?.trim();
	if (!originHeader) return null;

	let originUrl: URL;
	try {
		originUrl = new URL(originHeader);
	} catch {
		return null;
	}

	const requestHost = getRequestHost(request);
	if (requestHost && originUrl.host.toLowerCase() === requestHost) {
		return originUrl.origin;
	}

	return null;
};
