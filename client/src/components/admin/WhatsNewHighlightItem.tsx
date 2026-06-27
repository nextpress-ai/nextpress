import { cn } from "@/lib/utils";
import {
	RELEASE_HIGHLIGHT_META,
	type ReleaseHighlight,
} from "@shared/release/release-highlight-meta";

/** Single What's New row with kind badge and color-coded accent. */
export function WhatsNewHighlightItem({ item }: { item: ReleaseHighlight }) {
	const meta = RELEASE_HIGHLIGHT_META[item.kind];

	return (
		<li
			className={cn(
				"rounded-md border border-npb-border-subtle py-3 pl-3 pr-4",
				meta.cardClass,
			)}
		>
			<span
				className={cn(
					"mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]",
					meta.badgeClass,
				)}
			>
				<span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dotClass)} aria-hidden />
				{meta.label}
			</span>
			<p className="text-sm font-medium leading-snug text-npb-text-primary">{item.title}</p>
			<p className="mt-1.5 text-sm leading-relaxed text-npb-text-secondary">
				{item.description}
			</p>
		</li>
	);
}
