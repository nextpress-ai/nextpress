import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type LayoutSettingsSectionProps = {
	title: string;
	children: ReactNode;
	className?: string;
};

/** Flat section divider inside the layout inspector — avoids nested accordion chrome. */
export function LayoutSettingsSection({ title, children, className }: LayoutSettingsSectionProps) {
	return (
		<section className={cn("npb-settings-section space-y-4", className)} aria-label={title}>
			<h3 className="npb-settings-section-title">{title}</h3>
			{children}
		</section>
	);
}
