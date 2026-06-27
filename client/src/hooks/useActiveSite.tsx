import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { ACTIVE_SITE_STORAGE_KEY, formatSiteLabel } from "@/lib/site-api";

export type ActiveSiteItem = {
	id: string;
	name: string | null;
	siteUrl: string | null;
	isDefault: boolean;
};

type SitesResponse = {
	sites: ActiveSiteItem[];
	total: number;
};

type ActiveSiteContextValue = {
	sites: ActiveSiteItem[];
	activeSiteId: string;
	activeSite: ActiveSiteItem | undefined;
	isLoading: boolean;
	setActiveSiteId: (siteId: string) => void;
	formatSiteLabel: typeof formatSiteLabel;
};

const ActiveSiteContext = createContext<ActiveSiteContextValue | null>(null);

const pickInitialSiteId = (sites: ActiveSiteItem[]): string => {
	const stored =
		typeof window !== "undefined" ? localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) : null;
	if (stored && sites.some((site) => site.id === stored)) return stored;
	return sites.find((site) => site.isDefault)?.id ?? sites[0]?.id ?? "";
};

/**
 * Provides the admin user's active site context for multi-site installs.
 * Persists selection to localStorage and invalidates site-scoped queries on change.
 */
export function ActiveSiteProvider({ children }: { children: ReactNode }) {
	const { isAuthenticated } = useAuth();
	const queryClient = useQueryClient();
	const [activeSiteId, setActiveSiteIdState] = useState("");

	const { data: sitesData, isLoading } = useQuery<SitesResponse>({
		queryKey: ["/api/sites"],
		enabled: isAuthenticated,
	});

	const sites = sitesData?.sites ?? [];

	useEffect(() => {
		if (!isAuthenticated || sites.length === 0) return;
		setActiveSiteIdState((current) => {
			if (current && sites.some((site) => site.id === current)) return current;
			return pickInitialSiteId(sites);
		});
	}, [isAuthenticated, sites]);

	const setActiveSiteId = useCallback(
		(siteId: string) => {
			if (!siteId) return;
			setActiveSiteIdState(siteId);
			localStorage.setItem(ACTIVE_SITE_STORAGE_KEY, siteId);
			queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
			queryClient.invalidateQueries({ queryKey: ["/api/site"] });
			queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
			queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
			queryClient.invalidateQueries({ queryKey: ["/api/blogs"] });
			queryClient.invalidateQueries({ queryKey: ["/api/media"] });
			queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
			queryClient.invalidateQueries({ queryKey: ["/api/comments"] });
			queryClient.invalidateQueries({ queryKey: ["/api/options"] });
			queryClient.invalidateQueries({ queryKey: ["/api/themes"] });
			queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
		},
		[queryClient],
	);

	const activeSite = useMemo(
		() => sites.find((site) => site.id === activeSiteId),
		[sites, activeSiteId],
	);

	const value = useMemo(
		(): ActiveSiteContextValue => ({
			sites,
			activeSiteId,
			activeSite,
			isLoading,
			setActiveSiteId,
			formatSiteLabel,
		}),
		[sites, activeSiteId, activeSite, isLoading, setActiveSiteId],
	);

	return <ActiveSiteContext.Provider value={value}>{children}</ActiveSiteContext.Provider>;
}

/** Returns active site context; throws when used outside ActiveSiteProvider. */
export function useActiveSite(): ActiveSiteContextValue {
	const context = useContext(ActiveSiteContext);
	if (!context) {
		throw new Error("useActiveSite must be used within ActiveSiteProvider");
	}
	return context;
}

/** Safe variant for components that may render outside admin shell. */
export function useOptionalActiveSite(): ActiveSiteContextValue | null {
	return useContext(ActiveSiteContext);
}
