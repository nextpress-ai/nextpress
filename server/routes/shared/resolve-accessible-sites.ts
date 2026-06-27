import type { Deps } from "./deps";
import type { Site } from "@shared/schema-types";

export type SiteListItem = {
	id: string;
	name: string | null;
	siteUrl: string | null;
	isDefault: boolean;
};

/**
 * Sites the current user may manage (owned or role-assigned).
 * Falls back to the default site when none are linked yet.
 */
export const resolveAccessibleSites = async (params: {
	models: Deps["models"];
	userId: string;
}): Promise<SiteListItem[]> => {
	const { models, userId } = params;
	const byId = new Map<string, Site>();

	const ownedSites = await models.sites.findByOwner(userId);
	for (const site of ownedSites) {
		byId.set(site.id, site);
	}

	const roleAssignments = await models.userRoles.findByUser(userId);
	const roleSiteIds = [
		...new Set(
			roleAssignments
				.map((assignment) => assignment.siteId)
				.filter((id): id is string => typeof id === "string" && id.length > 0),
		),
	];

	for (const siteId of roleSiteIds) {
		if (byId.has(siteId)) continue;
		const site = await models.sites.findById(siteId);
		if (site) byId.set(site.id, site);
	}

	if (byId.size === 0) {
		const defaultSite = await models.sites.findDefaultSite();
		if (defaultSite) byId.set(defaultSite.id, defaultSite);
	}

	return [...byId.values()]
		.map((site) => ({
			id: site.id,
			name: site.name ?? null,
			siteUrl: site.siteUrl ?? null,
			isDefault: site.isDefault ?? false,
		}))
		.sort((a, b) => {
			if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
			const aLabel = a.name ?? a.siteUrl ?? a.id;
			const bLabel = b.name ?? b.siteUrl ?? b.id;
			return aLabel.localeCompare(bLabel);
		});
};
