import { Palette } from "lucide-react";

type ThemeColorSettings = {
	colors?: Record<string, string | undefined>;
};

type ThemeColorPreviewProps = {
	settings?: ThemeColorSettings | null;
	className?: string;
};

/**
 * Renders a theme preview from stored color settings — no stock photography.
 */
export function ThemeColorPreview({
	settings,
	className = "h-32 w-full rounded-[var(--npb-radius-surface)]",
}: ThemeColorPreviewProps) {
	const colors = settings?.colors;
	const swatches = colors
		? [colors.primary, colors.secondary, colors.accent, colors.background].filter(
				(value): value is string => Boolean(value),
			)
		: [];

	if (swatches.length === 0) {
		return (
			<div
				className={`flex items-center justify-center bg-npb-surface-inset ${className}`}
				aria-hidden
			>
				<Palette className="h-10 w-10 text-npb-text-muted" />
			</div>
		);
	}

	return (
		<div className={`flex overflow-hidden ${className}`} aria-hidden>
			{swatches.map((color) => (
				<div key={color} className="min-w-0 flex-1" style={{ backgroundColor: color }} />
			))}
		</div>
	);
}
