import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { WhatsNewDialog } from "@/components/admin/WhatsNewDialog";
import { NEXTPRESS_CONFIG } from "../../../../config";
import { cn } from "@/lib/utils";

type ReleaseResponse = {
	installedVersion: string;
	latestVersion: string;
	updateAvailable: boolean;
	releaseDate: string;
	highlights: Array<{ title: string; description: string }>;
	updateCheck?: {
		source: string;
		ok: boolean;
		note: string;
	};
};

/**
 * Sidebar notice with an orange beacon for updates and release notes.
 * Stays visible after click — only the dialog opens/closes.
 */
export function WhatsNewSidebarBanner() {
	const [open, setOpen] = useState(false);
	const { data: release } = useQuery<ReleaseResponse>({
		queryKey: ["/api/system/release"],
	});

	const latestVersion = release?.latestVersion ?? NEXTPRESS_CONFIG.version;
	const showUpdateBanner = release?.updateAvailable ?? false;
	const showWhatsNewBanner = !showUpdateBanner;

	if (!showUpdateBanner && !showWhatsNewBanner) return null;

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className={cn(
					"np-sidebar-attention-banner mx-3 mb-2 flex w-[calc(100%-1.5rem)] items-start gap-2 rounded border px-2 py-2 text-left text-[11px] leading-tight transition-colors hover:bg-white/10",
					showUpdateBanner
						? "np-sidebar-attention-banner--update border-orange-500/50 bg-orange-500/10 text-orange-50"
						: "border-orange-500/30 bg-white/5 text-zinc-200",
				)}
			>
				<span
					className={cn(
						"np-sidebar-attention-dot mt-1 shrink-0",
						showUpdateBanner && "np-sidebar-attention-dot--urgent",
					)}
					aria-hidden
				/>
				<span className="min-w-0">
					{showUpdateBanner ? (
						<>
							<span className="block font-semibold text-orange-100">
								Update available · v{release?.latestVersion}
							</span>
							<span className="mt-0.5 block text-[10px] text-orange-200/80">
								Installed v{release?.installedVersion}
							</span>
						</>
					) : (
						<>
							<span className="block font-medium text-zinc-100">What&apos;s new</span>
							<span className="mt-0.5 block text-[10px] text-zinc-400">
								v{latestVersion} changes
							</span>
						</>
					)}
				</span>
			</button>

			<WhatsNewDialog open={open} onOpenChange={setOpen} release={release} />
		</>
	);
}
