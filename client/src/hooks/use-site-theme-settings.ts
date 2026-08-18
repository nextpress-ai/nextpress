import { useQuery } from "@tanstack/react-query";
import { themeSettingsToCssVars } from "@shared/theme-to-css-vars";
import type { ThemeSettings } from "@shared/theme-settings";
import { appendSiteIdToUrl } from "@/lib/site-api";

type SiteThemeResponse = {
	themeId: string | null;
	settings: ThemeSettings;
};

/**
 * Loads active site theme design tokens for visitor page rendering.
 */
export function useSiteThemeSettings(siteId: string | undefined): {
	settings: ThemeSettings | undefined;
	cssVars: Record<string, string>;
	isLoading: boolean;
} {
	const { data, isLoading } = useQuery<SiteThemeResponse>({
		queryKey: ["/api/public/site-theme", { siteId }],
		queryFn: async () => {
			const response = await fetch(appendSiteIdToUrl("/api/public/site-theme", siteId));
			if (!response.ok) {
				throw new Error("Could not load site theme");
			}
			return response.json() as Promise<SiteThemeResponse>;
		},
		enabled: Boolean(siteId),
		staleTime: 60_000,
	});

	const settings = data?.settings;
	const cssVars = settings ? themeSettingsToCssVars(settings) : {};

	return { settings, cssVars, isLoading };
}
