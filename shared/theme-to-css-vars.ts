import type { ThemeSettings, ThemeTypographyToken, ThemeButtonSize } from "./theme-settings.js";
import { DEFAULT_THEME_SETTINGS, isEmptyThemeSettingsRaw } from "./theme-settings.js";

const typographyPrefixMap = {
	title: "title",
	subheading: "subheading",
	body: "body",
	small: "small",
} as const;

const appendTypographyVars = (
	vars: Record<string, string>,
	prefix: string,
	token: ThemeTypographyToken | undefined,
	defaults: ThemeTypographyToken | undefined,
): void => {
	if (!token && !defaults) return;
	const source = { ...defaults, ...token };
	if (source.fontFamily) vars[`--np-site-font-${prefix}-family`] = source.fontFamily;
	if (source.fontSize) vars[`--np-site-font-${prefix}-size`] = source.fontSize;
	if (source.fontWeight) vars[`--np-site-font-${prefix}-weight`] = source.fontWeight;
	if (source.lineHeight) vars[`--np-site-font-${prefix}-line-height`] = source.lineHeight;
};

const appendButtonSizeVars = (
	vars: Record<string, string>,
	size: "sm" | "md" | "lg",
	token: ThemeButtonSize | undefined,
): void => {
	if (!token) return;
	if (token.fontSize) vars[`--np-site-button-${size}-font-size`] = token.fontSize;
	if (token.paddingX) vars[`--np-site-button-${size}-padding-x`] = token.paddingX;
	if (token.paddingY) vars[`--np-site-button-${size}-padding-y`] = token.paddingY;
	if (token.minHeight) vars[`--np-site-button-${size}-min-height`] = token.minHeight;
};

/**
 * Maps parsed theme settings to CSS custom properties for visitor surfaces.
 * Returns `{}` when raw settings are empty so hardcoded `.np-visitor-document` defaults win.
 */
export const themeSettingsToCssVars = (
	settings: ThemeSettings,
	rawSettings?: unknown,
): Record<string, string> => {
	if (rawSettings !== undefined && isEmptyThemeSettingsRaw(rawSettings)) {
		return {};
	}

	const colors = settings.colors ?? DEFAULT_THEME_SETTINGS.colors!;
	const vars: Record<string, string> = {};

	const setColor = (cssVar: string, value: string | undefined): void => {
		if (value) vars[cssVar] = value;
	};

	setColor("--np-site-background", colors.background);
	setColor("--np-site-foreground", colors.foreground);
	setColor("--np-site-muted", colors.muted);
	setColor("--np-site-muted-foreground", colors.mutedForeground);
	setColor("--np-site-accent", colors.accent ?? colors.primary);
	setColor("--np-site-accent-hover", colors.accentHover);
	setColor("--np-site-accent-foreground", colors.accentForeground);
	setColor("--np-site-primary", colors.primary ?? colors.accent);
	setColor("--np-site-primary-foreground", colors.primaryForeground);
	setColor("--np-site-secondary", colors.secondary);
	setColor("--np-site-border", colors.border);
	setColor("--np-site-destructive", colors.destructive);

	// Bridge to existing block CSS var references.
	setColor("--npb-surface-base", colors.background);
	setColor("--npb-canvas-page", colors.background);
	setColor("--npb-surface-raised", colors.muted ?? colors.secondary);
	setColor("--npb-text-primary", colors.foreground);
	setColor("--npb-text-secondary", colors.mutedForeground);
	setColor("--npb-text-muted", colors.mutedForeground);
	setColor("--npb-accent", colors.accent ?? colors.primary);
	setColor("--npb-accent-hover", colors.accentHover);
	setColor("--npb-accent-foreground", colors.accentForeground);
	setColor("--npb-border-default", colors.border);
	setColor("--npb-divider", colors.border);

	const shape = settings.shape ?? DEFAULT_THEME_SETTINGS.shape;
	if (shape?.radius) {
		vars["--np-site-radius"] = shape.radius;
		vars["--npb-radius-surface"] = shape.radius;
		vars["--npb-radius-input"] = shape.radius;
	}

	const shadows = settings.shadows ?? DEFAULT_THEME_SETTINGS.shadows;
	if (shadows?.sm) vars["--np-site-shadow-sm"] = shadows.sm;
	if (shadows?.md) vars["--np-site-shadow-md"] = shadows.md;
	if (shadows?.lg) vars["--np-site-shadow-lg"] = shadows.lg;
	if (shadows?.sm) vars["--npb-shadow-surface"] = shadows.sm;

	const typography = settings.typography ?? DEFAULT_THEME_SETTINGS.typography;
	const typographyDefaults = DEFAULT_THEME_SETTINGS.typography!;
	for (const [key, prefix] of Object.entries(typographyPrefixMap)) {
		appendTypographyVars(
			vars,
			prefix,
			typography?.[key as keyof typeof typographyPrefixMap],
			typographyDefaults[key as keyof typeof typographyDefaults],
		);
	}

	const buttons = settings.buttons ?? DEFAULT_THEME_SETTINGS.buttons;
	if (buttons?.fontFamily) {
		vars["--np-site-button-font-family"] = buttons.fontFamily;
	}
	appendButtonSizeVars(vars, "sm", buttons?.sizes?.sm);
	appendButtonSizeVars(vars, "md", buttons?.sizes?.md);
	appendButtonSizeVars(vars, "lg", buttons?.sizes?.lg);

	return vars;
};

/** Serializes CSS vars as a scoped style block for SSR `<head>`. */
export const themeSettingsToStyleBlock = (
	settings: ThemeSettings,
	rawSettings?: unknown,
): string => {
	const vars = themeSettingsToCssVars(settings, rawSettings);
	const entries = Object.entries(vars);
	if (entries.length === 0) return "";

	const declarations = entries.map(([key, value]) => `  ${key}: ${value};`).join("\n");
	return `.np-visitor-document {\n${declarations}\n}`;
};

/** Converts CSS var map to a React/CSSProperties-friendly style object. */
export const themeCssVarsToStyle = (
	vars: Record<string, string>,
): Record<string, string> => ({ ...vars });
