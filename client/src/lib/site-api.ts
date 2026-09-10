/** Persists the admin user's selected site across sessions. */
export const ACTIVE_SITE_STORAGE_KEY = "np-active-site-id";

/**
 * Appends `siteId` as a query param when targeting a specific site.
 * No-op when siteId is empty (server falls back to default site).
 */
export const appendSiteIdToUrl = (url: string, siteId: string | undefined): string => {
	if (!siteId) return url;
	const separator = url.includes("?") ? "&" : "?";
	return `${url}${separator}siteId=${encodeURIComponent(siteId)}`;
};

/** Visitor site hint so public fetches match the page, not the default site. */
export const readVisitorSiteIdHint = (): string | undefined => {
	if (typeof window === "undefined") return undefined;
	const fromQuery = new URLSearchParams(window.location.search).get("siteId");
	if (fromQuery) return fromQuery;
	const pathMatch = window.location.pathname.match(/^\/sites\/([^/]+)\//);
	if (!pathMatch?.[1]) return undefined;
	try {
		return decodeURIComponent(pathMatch[1]);
	} catch {
		return pathMatch[1];
	}
};

/** Builds a site-scoped options API URL. */
export const buildSiteOptionUrl = (params: { name: string; siteId: string }): string =>
	appendSiteIdToUrl(`/api/options/${params.name}`, params.siteId);

/** Human-readable label for site switcher and selectors. */
export const formatSiteLabel = (site: {
	id: string;
	name?: string | null;
	siteUrl?: string | null;
	isDefault?: boolean | null;
}): string => {
	if (site.name?.trim()) return site.name.trim();
	if (site.siteUrl?.trim()) return site.siteUrl.trim();
	return `Site ${site.id.slice(0, 8)}`;
};
