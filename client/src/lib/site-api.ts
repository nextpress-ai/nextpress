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
