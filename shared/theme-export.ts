import { z } from "zod";
import { themeSettingsSchema, parseThemeSettings, type ThemeSettings } from "./theme-settings.js";

export const THEME_EXPORT_FORMAT = "nextpress-theme" as const;
export const THEME_EXPORT_VERSION = 1;

export const themeExportDocumentSchema = z.object({
	format: z.literal(THEME_EXPORT_FORMAT),
	version: z.literal(THEME_EXPORT_VERSION),
	name: z.string().trim().min(1).max(120),
	description: z.string().trim().max(500).optional(),
	settings: themeSettingsSchema,
	exportedAt: z.string().datetime().optional(),
});

export type ThemeExportDocument = z.infer<typeof themeExportDocumentSchema>;

type ThemeImportFailure = {
	ok: false;
	message: string;
};

type ThemeImportSuccess = {
	ok: true;
	document: ThemeExportDocument;
};

export type ThemeImportResult = ThemeImportFailure | ThemeImportSuccess;

const legacyImportSchema = z.object({
	name: z.string().trim().min(1).max(120).optional(),
	description: z.string().trim().max(500).optional(),
	settings: themeSettingsSchema,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Builds a portable theme file for download or handoff to another NextPress site.
 */
export const buildThemeExportDocument = ({
	name,
	description,
	settings,
}: {
	name: string;
	description?: string | null;
	settings: ThemeSettings;
}): ThemeExportDocument => ({
	format: THEME_EXPORT_FORMAT,
	version: THEME_EXPORT_VERSION,
	name: name.trim(),
	description: description?.trim() || undefined,
	settings: parseThemeSettings(settings),
	exportedAt: new Date().toISOString(),
});

/**
 * Parses an imported theme file — supports the versioned envelope and legacy `{ settings }` payloads.
 */
export const parseThemeImportDocument = (raw: unknown): ThemeImportResult => {
	if (!isRecord(raw)) {
		return { ok: false, message: "Theme file must be a JSON object." };
	}

	if ("format" in raw && raw.format !== THEME_EXPORT_FORMAT) {
		return { ok: false, message: "Unsupported theme file format." };
	}

	const envelope = themeExportDocumentSchema.safeParse(raw);
	if (envelope.success) {
		return {
			ok: true,
			document: {
				...envelope.data,
				settings: parseThemeSettings(envelope.data.settings),
			},
		};
	}

	const legacy = legacyImportSchema.safeParse(raw);
	if (legacy.success) {
		return {
			ok: true,
			document: buildThemeExportDocument({
				name: legacy.data.name ?? "Imported theme",
				description: legacy.data.description,
				settings: legacy.data.settings,
			}),
		};
	}

	if (themeSettingsSchema.safeParse(raw).success) {
		return {
			ok: true,
			document: buildThemeExportDocument({
				name: "Imported theme",
				settings: parseThemeSettings(raw),
			}),
		};
	}

	return {
		ok: false,
		message: "This file is not a valid NextPress theme.",
	};
};
