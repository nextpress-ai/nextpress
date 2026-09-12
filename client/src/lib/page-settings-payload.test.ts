import { describe, expect, it } from "vitest";
import { buildPageSettingsPayload } from "./page-settings-payload";
import type { Page } from "@shared/schema-types";

const page = {
	id: "page-1",
	title: "About",
	slug: "about",
	status: "draft",
	version: 1,
	other: {
		design: { fontFamily: "Georgia, serif", containerWidth: "960px", padding: "1rem" },
		seo: { metaTitle: "Old" },
		icons: { defaultSet: "lucide", defaultSize: 24 },
	},
} as Page;

const values = {
	title: "About",
	slug: "about",
	status: "draft",
	featuredImage: "",
	allowComments: false,
	password: "",
	parentId: "",
	menuOrder: 0,
	templateId: "",
	metaTitle: "About us",
	metaDescription: "",
	canonicalUrl: "",
	noIndex: false,
	customMetaTags: [],
	iconDefaultSet: "lucide" as const,
	iconDefaultSize: 24,
};

describe("buildPageSettingsPayload", () => {
	it("does not write page design from settings", () => {
		const payload = buildPageSettingsPayload({
			page,
			isTemplate: false,
			contentType: "page",
			values,
		});
		if (!("other" in payload)) throw new Error("expected page payload");
		expect(payload.other.design).toEqual(page.other?.design);
		expect(payload.other.seo?.metaTitle).toBe("About us");
	});
});
