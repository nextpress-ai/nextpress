import { describe, expect, it } from "vitest";
import {
	THEME_EXPORT_FORMAT,
	THEME_EXPORT_VERSION,
	buildThemeExportDocument,
	parseThemeImportDocument,
} from "./theme-export.js";
import { DEFAULT_THEME_SETTINGS } from "./theme-settings.js";

describe("theme-export", () => {
	it("builds a versioned export envelope", () => {
		const doc = buildThemeExportDocument({
			name: "Brand",
			description: "Campaign look",
			settings: DEFAULT_THEME_SETTINGS,
		});

		expect(doc.format).toBe(THEME_EXPORT_FORMAT);
		expect(doc.version).toBe(THEME_EXPORT_VERSION);
		expect(doc.name).toBe("Brand");
		expect(doc.settings.icons?.set).toBe("lucide");
		expect(doc.exportedAt).toBeTruthy();
	});

	it("parses a versioned export file", () => {
		const doc = buildThemeExportDocument({
			name: "Brand",
			settings: DEFAULT_THEME_SETTINGS,
		});
		const parsed = parseThemeImportDocument(doc);
		expect(parsed.ok).toBe(true);
		if (parsed.ok) {
			expect(parsed.document.name).toBe("Brand");
		}
	});

	it("accepts legacy settings-only payloads", () => {
		const parsed = parseThemeImportDocument({ settings: DEFAULT_THEME_SETTINGS });
		expect(parsed.ok).toBe(true);
		if (parsed.ok) {
			expect(parsed.document.name).toBe("Imported theme");
		}
	});

	it("rejects invalid JSON shapes", () => {
		expect(parseThemeImportDocument(null).ok).toBe(false);
		expect(parseThemeImportDocument({ format: "other" }).ok).toBe(false);
	});
});
