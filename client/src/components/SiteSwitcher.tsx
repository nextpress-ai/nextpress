import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useOptionalActiveSite } from "@/hooks/useActiveSite";

/**
 * Admin top-bar site switcher. Hidden when only one site is available.
 */
export function SiteSwitcher() {
	const activeSite = useOptionalActiveSite();

	if (!activeSite || activeSite.isLoading || activeSite.sites.length <= 1) {
		return null;
	}

	return (
		<Select value={activeSite.activeSiteId} onValueChange={activeSite.setActiveSiteId}>
			<SelectTrigger
				className="h-7 w-[180px] border-white/10 bg-white/5 text-xs text-zinc-200"
				aria-label="Active site"
			>
				<SelectValue placeholder="Select site" />
			</SelectTrigger>
			<SelectContent>
				{activeSite.sites.map((site) => (
					<SelectItem key={site.id} value={site.id}>
						{activeSite.formatSiteLabel(site)}
						{site.isDefault ? " (default)" : ""}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
