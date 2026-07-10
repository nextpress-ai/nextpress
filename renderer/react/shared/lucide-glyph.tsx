import * as React from "react";
import * as LucideIcons from "lucide-react";

function kebabToPascal(kebab: string): string {
	return kebab
		.split("-")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join("");
}

function resolveLucideComponent(name: string): React.ComponentType<{
	size?: number | string;
	color?: string;
	strokeWidth?: number | string;
	className?: string;
	style?: React.CSSProperties;
}> | null {
	const pascal = kebabToPascal(name);
	const mod = LucideIcons as Record<string, React.ComponentType<Record<string, unknown>> | undefined>;
	return (mod[pascal] ?? mod[`${pascal}Icon`] ?? null) as React.ComponentType<{
		size?: number | string;
		color?: string;
		strokeWidth?: number | string;
		className?: string;
		style?: React.CSSProperties;
	}> | null;
}

export type LucideGlyphProps = {
	iconName: string;
	size?: number | string;
	color?: string;
	strokeWidth?: number | string;
	className?: string;
	style?: React.CSSProperties;
	"aria-label"?: string;
};

/** Renders a lucide icon by kebab-case name for publish/preview/SSR paths. */
export function LucideGlyph({
	iconName,
	size = 24,
	color = "currentColor",
	strokeWidth = 2,
	className,
	style,
	...rest
}: LucideGlyphProps): React.ReactNode {
	const Component = resolveLucideComponent(iconName);
	if (!Component) {
		return (
			<svg
				width={size}
				height={size}
				viewBox="0 0 24 24"
				fill="none"
				stroke={color}
				strokeWidth={strokeWidth}
				className={className}
				style={style}
				aria-hidden={rest["aria-label"] ? undefined : true}
				{...rest}
			>
				<rect x="3" y="3" width="18" height="18" rx="2" opacity="0.15" />
				<circle cx="12" cy="12" r="3" opacity="0.3" />
			</svg>
		);
	}

	return (
		<Component
			size={size}
			color={color}
			strokeWidth={strokeWidth}
			className={className}
			style={style}
			{...rest}
		/>
	);
}
