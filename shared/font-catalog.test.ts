import { describe, expect, it } from "vitest";
import {
	resolveFontCatalogLabel,
	resolveFontCatalogValue,
} from "./font-catalog";

describe("resolveFontCatalogValue", () => {
	it("maps legacy system-ui stack to catalog value", () => {
		expect(resolveFontCatalogValue("system-ui, sans-serif")).toBe("system-ui");
	});

	it("returns catalog value for bundled fonts", () => {
		expect(resolveFontCatalogValue("Inter, sans-serif")).toBe("Inter, sans-serif");
	});

	it("defaults empty values to system-ui", () => {
		expect(resolveFontCatalogValue("")).toBe("system-ui");
		expect(resolveFontCatalogValue(undefined)).toBe("system-ui");
	});
});

describe("resolveFontCatalogLabel", () => {
	it("shows a readable label for legacy values", () => {
		expect(resolveFontCatalogLabel("system-ui, sans-serif")).toBe("System Default");
	});
});
