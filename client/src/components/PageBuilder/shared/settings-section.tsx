import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SettingsSectionProps = {
	children: ReactNode;
	className?: string;
};

/**
 * The body for a block whose settings are one group. There is no header to open and close, so
 * the panel is just the controls — the block's name is already the title above the tabs.
 */
export function SettingsSection({ children, className }: SettingsSectionProps) {
	return <div className={cn("space-y-4 px-4 py-4", className)}>{children}</div>;
}
