import { useId, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type SettingsDisclosureProps = {
	title: string;
	children: ReactNode;
	/** Open on first paint — pass true only when the person already set something inside. */
	defaultOpen?: boolean;
	className?: string;
};

/**
 * A quiet "show more" row for sub-groups inside an open card (Hover colors, Margin, Button style).
 * No card chrome: the design system bans card-in-card, so this is a divider plus a toggle.
 * Content is not mounted while closed, which keeps heavy children (palettes) out of the DOM.
 */
export function SettingsDisclosure({
	title,
	children,
	defaultOpen = false,
	className,
}: SettingsDisclosureProps) {
	const [open, setOpen] = useState(defaultOpen);
	const panelId = useId();

	return (
		<div className={cn("border-t border-npb-divider pt-3", className)}>
			<button
				type="button"
				className="flex w-full items-center gap-1.5 text-left text-sm font-semibold text-npb-text-secondary hover:text-npb-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-npb-focus"
				aria-expanded={open}
				aria-controls={panelId}
				onClick={() => setOpen((current) => !current)}
			>
				<ChevronRight
					className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-90")}
					aria-hidden
				/>
				{title}
			</button>
			{open ? (
				<div id={panelId} className="mt-3 space-y-4">
					{children}
				</div>
			) : null}
		</div>
	);
}
