import { useId, useState, type ComponentType, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Accordion panel for page builder sidebar block settings.
 * Chrome reads tokens from `.npb-editor-sidebar` / `--light` (see `client/src/index.css`).
 */
export function CollapsibleCard({
	title,
	icon: Icon,
	children,
	defaultOpen = false,
	className = "",
}: {
	title: string;
	icon?: ComponentType<{ className?: string }>;
	children: ReactNode;
	defaultOpen?: boolean;
	className?: string;
}) {
	const [isOpen, setIsOpen] = useState(defaultOpen);
	const panelId = useId();

	return (
		<Card
			data-npb-collapsible-card
			className={cn(
				"npb-settings-collapsible-card rounded-none border-0 bg-transparent p-0 shadow-none",
				className,
			)}
		>
			<button
				type="button"
				className="npb-settings-collapsible-header npb-settings-collapsible-trigger !p-4"
				onClick={() => setIsOpen((open) => !open)}
				aria-expanded={isOpen}
				aria-controls={panelId}
			>
				<span className="flex items-center justify-between">
					<span className="flex items-center gap-2">
						{Icon ? (
							<Icon className="npb-settings-collapsible-icon h-4 w-4 shrink-0" />
						) : null}
						<span className="npb-settings-collapsible-title">{title}</span>
					</span>
					<ChevronRight
						className={cn(
							"npb-settings-collapsible-chevron h-4 w-4 shrink-0",
							isOpen && "npb-settings-collapsible-chevron--open",
						)}
						aria-hidden
					/>
				</span>
			</button>
			<div
				id={panelId}
				className={cn(
					"npb-settings-collapsible-panel grid",
					isOpen ? "npb-settings-collapsible-panel--open" : "npb-settings-collapsible-panel--closed",
				)}
			>
				<div className="overflow-hidden">
					<CardContent className="space-y-4 !p-4 !pt-4">{children}</CardContent>
				</div>
			</div>
		</Card>
	);
}
