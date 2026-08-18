/** User-facing default theme copy (site owners, not engineers). */
export const DEFAULT_THEME_NAME = "Default";
export const DEFAULT_THEME_DESCRIPTION = "Default colors for new sites.";

/** Legacy seed from the old ThemeManager — renamed on migrate / server boot. */
export const LEGACY_DEFAULT_THEME_NAME = "Custom SSR";
export const LEGACY_DEFAULT_THEME_DESCRIPTION =
	"A custom server-side rendered theme with modern styling and responsive design. Built specifically for NextPress with optimized HTML output.";

type ThemeCopy = {
	name: string;
	description?: string | null;
	other?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** Marks the built-in seed theme that ships with NextPress — not user-editable. */
export const SYSTEM_DEFAULT_THEME_OTHER = { isSystemDefault: true } as const;

/** True for the seeded Default theme (including legacy "Custom SSR" rows). */
export function isSystemDefaultTheme(theme: ThemeCopy): boolean {
	if (isLegacyDefaultThemeCopy(theme)) {
		return true;
	}

	if (isRecord(theme.other) && theme.other.isSystemDefault === true) {
		return true;
	}

	return theme.name === DEFAULT_THEME_NAME;
}

/** True when a row still carries the pre-2026-08 default theme label or blurb. */
export function isLegacyDefaultThemeCopy(theme: ThemeCopy): boolean {
	return (
		theme.name === LEGACY_DEFAULT_THEME_NAME ||
		theme.description === LEGACY_DEFAULT_THEME_DESCRIPTION
	);
}

/** Normalized name and description for admin UI and seed repair. */
export function resolveThemeDisplayCopy(theme: ThemeCopy): {
	name: string;
	description: string;
} {
	if (isLegacyDefaultThemeCopy(theme)) {
		return {
			name: DEFAULT_THEME_NAME,
			description: DEFAULT_THEME_DESCRIPTION,
		};
	}

	return {
		name: theme.name,
		description: theme.description?.trim() || DEFAULT_THEME_DESCRIPTION,
	};
}
