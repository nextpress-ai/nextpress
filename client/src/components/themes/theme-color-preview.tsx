import { Palette } from "lucide-react";

import type { ThemeSettings } from "@shared/theme-settings";
import { parseThemeSettings } from "@shared/theme-settings";

type ThemeColorPreviewProps = {
	settings?: ThemeSettings | null;
	className?: string;
	/** Narrow swatch for table rows. */
	compact?: boolean;
};

/**
 * Renders a theme preview from stored color settings — no stock photography.
 */
export function ThemeColorPreview({
	settings,
	className,
	compact = false,
}: ThemeColorPreviewProps) {
	const parsed = settings ? parseThemeSettings(settings) : null;
	const colors = parsed?.colors;
	const swatches = colors
		? [colors.accent, colors.primary, colors.secondary, colors.background].filter(
				(value): value is string => Boolean(value),
			)
		: [];

	const resolvedClassName =
		className ??
		(compact
			? "h-10 w-16 shrink-0 rounded-[var(--npb-radius-input)]"
			: "h-32 w-full rounded-[var(--npb-radius-surface)]");

	if (swatches.length === 0) {
		return (
			<div
				className={`flex items-center justify-center bg-npb-surface-inset ${resolvedClassName}`}
				aria-hidden
			>
				<Palette className={compact ? "h-4 w-4 text-npb-text-muted" : "h-10 w-10 text-npb-text-muted"} />
			</div>
		);
	}

	return (
		<div className={`flex overflow-hidden ${resolvedClassName}`} aria-hidden>
			{swatches.map((color) => (
				<div key={color} className="min-w-0 flex-1" style={{ backgroundColor: color }} />
			))}
		</div>
	);
}
