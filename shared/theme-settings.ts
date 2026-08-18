import { z } from "zod";

const cssColorSchema = z.string().min(1);
const cssSizeSchema = z.string().min(1);

export const themeTypographyTokenSchema = z.object({
	fontFamily: z.string().optional(),
	fontSize: cssSizeSchema.optional(),
	fontWeight: z.string().optional(),
	lineHeight: z.string().optional(),
});

export const themeButtonSizeSchema = z.object({
	fontSize: cssSizeSchema.optional(),
	paddingX: cssSizeSchema.optional(),
	paddingY: cssSizeSchema.optional(),
	minHeight: cssSizeSchema.optional(),
});

export const themeSettingsSchema = z.object({
	colors: z
		.object({
			background: cssColorSchema.optional(),
			foreground: cssColorSchema.optional(),
			muted: cssColorSchema.optional(),
			mutedForeground: cssColorSchema.optional(),
			accent: cssColorSchema.optional(),
			accentHover: cssColorSchema.optional(),
			accentForeground: cssColorSchema.optional(),
			primary: cssColorSchema.optional(),
			primaryForeground: cssColorSchema.optional(),
			secondary: cssColorSchema.optional(),
			border: cssColorSchema.optional(),
			destructive: cssColorSchema.optional(),
			/** @deprecated legacy seed key — mapped to accent on parse */
			text: cssColorSchema.optional(),
		})
		.optional(),
	typography: z
		.object({
			title: themeTypographyTokenSchema.optional(),
			subheading: themeTypographyTokenSchema.optional(),
			body: themeTypographyTokenSchema.optional(),
			small: themeTypographyTokenSchema.optional(),
		})
		.optional(),
	buttons: z
		.object({
			fontFamily: z.string().optional(),
			sizes: z
				.object({
					sm: themeButtonSizeSchema.optional(),
					md: themeButtonSizeSchema.optional(),
					lg: themeButtonSizeSchema.optional(),
				})
				.optional(),
		})
		.optional(),
	shape: z
		.object({
			radius: cssSizeSchema.optional(),
		})
		.optional(),
	shadows: z
		.object({
			sm: z.string().optional(),
			md: z.string().optional(),
			lg: z.string().optional(),
		})
		.optional(),
	icons: z
		.object({
			set: z.enum(["lucide", "react-icons", "svgl", "all"]).optional(),
		})
		.optional(),
	layout: z.record(z.unknown()).optional(),
	features: z.record(z.unknown()).optional(),
});

export type ThemeTypographyToken = z.infer<typeof themeTypographyTokenSchema>;
export type ThemeButtonSize = z.infer<typeof themeButtonSizeSchema>;
export type ThemeSettings = z.infer<typeof themeSettingsSchema>;

/** Matches `.np-visitor-document` baseline in client/src/index.css. */
export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
	colors: {
		background: "#ffffff",
		foreground: "#18181b",
		muted: "#f9fafb",
		mutedForeground: "#71717a",
		accent: "#3b82f6",
		accentHover: "#2563eb",
		accentForeground: "#ffffff",
		primary: "#3b82f6",
		primaryForeground: "#ffffff",
		secondary: "#f3f4f6",
		border: "rgb(0 0 0 / 0.06)",
		destructive: "#ef4444",
	},
	typography: {
		title: {
			fontFamily: "system-ui",
			fontSize: "2.25rem",
			fontWeight: "700",
			lineHeight: "1.2",
		},
		subheading: {
			fontFamily: "system-ui",
			fontSize: "1.5rem",
			fontWeight: "600",
			lineHeight: "1.3",
		},
		body: {
			fontFamily: "system-ui",
			fontSize: "1rem",
			fontWeight: "400",
			lineHeight: "1.5",
		},
		small: {
			fontFamily: "system-ui",
			fontSize: "0.875rem",
			fontWeight: "400",
			lineHeight: "1.4",
		},
	},
	buttons: {
		fontFamily: "system-ui",
		sizes: {
			sm: { fontSize: "0.875rem", paddingX: "0.75rem", paddingY: "0.375rem", minHeight: "2rem" },
			md: { fontSize: "1rem", paddingX: "1rem", paddingY: "0.5rem", minHeight: "2.25rem" },
			lg: { fontSize: "1.125rem", paddingX: "1.25rem", paddingY: "0.625rem", minHeight: "2.75rem" },
		},
	},
	shape: {
		radius: "0.5rem",
	},
	shadows: {
		sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
		md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
		lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
	},
	icons: {
		set: "lucide",
	},
	layout: {
		maxWidth: "800px",
		sidebar: "none",
		navigation: "top",
	},
	features: {
		responsiveDesign: true,
		darkMode: false,
	},
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const deepMerge = <T extends Record<string, unknown>>(base: T, patch: Record<string, unknown>): T => {
	const result = { ...base };
	for (const [key, value] of Object.entries(patch)) {
		if (isRecord(value) && isRecord(result[key])) {
			result[key] = deepMerge(result[key] as Record<string, unknown>, value) as T[Extract<keyof T, string>];
		} else if (value !== undefined) {
			result[key] = value as T[Extract<keyof T, string>];
		}
	}
	return result;
};

/** Maps legacy seed color keys onto the typed design token shape. */
export const normalizeLegacyThemeColors = (
	colors: Record<string, unknown> | undefined,
): ThemeSettings["colors"] => {
	if (!colors) return undefined;

	const next: NonNullable<ThemeSettings["colors"]> = {};

	const assign = (key: keyof NonNullable<ThemeSettings["colors"]>, value: unknown): void => {
		if (typeof value === "string" && value.trim()) {
			next[key] = value;
		}
	};

	assign("background", colors.background);
	assign("foreground", colors.text ?? colors.foreground);
	assign("accent", colors.accent ?? colors.primary);
	assign("accentHover", colors.accentHover);
	assign("primary", colors.primary ?? colors.accent);
	assign("secondary", colors.secondary);
	assign("mutedForeground", colors.mutedForeground);
	assign("muted", colors.muted);
	assign("border", colors.border);
	assign("destructive", colors.destructive);

	return Object.keys(next).length > 0 ? next : undefined;
};

/**
 * Validates and merges stored theme settings with defaults.
 * Legacy `{ colors: { primary, text, ... } }` rows remain compatible.
 */
export const parseThemeSettings = (raw: unknown): ThemeSettings => {
	if (!isRecord(raw)) {
		return structuredClone(DEFAULT_THEME_SETTINGS);
	}

	const legacyColors = normalizeLegacyThemeColors(
		isRecord(raw.colors) ? raw.colors : undefined,
	);

	const withoutLegacyColors = { ...raw };
	if (legacyColors) {
		delete withoutLegacyColors.colors;
	}

	const merged = deepMerge(
		structuredClone(DEFAULT_THEME_SETTINGS) as Record<string, unknown>,
		withoutLegacyColors,
	);

	if (legacyColors) {
		merged.colors = deepMerge(
			(merged.colors as Record<string, unknown>) ?? {},
			legacyColors as Record<string, unknown>,
		);
	}

	const parsed = themeSettingsSchema.safeParse(merged);
	if (!parsed.success) {
		return structuredClone(DEFAULT_THEME_SETTINGS);
	}

	return parsed.data;
};

/** Returns true when raw settings are missing or an empty object. */
export const isEmptyThemeSettingsRaw = (raw: unknown): boolean => {
	if (raw == null) return true;
	if (!isRecord(raw)) return true;
	return Object.keys(raw).length === 0;
};
