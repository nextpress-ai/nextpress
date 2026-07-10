import { describe, expect, it } from "vitest";
import { validateIconReference } from "./validate-icon-reference.js";
import { mergePageOtherWithDefaults, validatePageOtherForSave } from "./page-other.js";
import { validateContentForSave } from "./validate-content-save.js";

describe("validateIconReference", () => {
	it("accepts known lucide icons (kebab-case and PascalCase)", () => {
		expect(validateIconReference({ iconSet: "lucide", iconName: "search" }).ok).toBe(true);
		expect(validateIconReference({ iconSet: "lucide", iconName: "Star" }).ok).toBe(true);
	});

	it("rejects unknown lucide icons", () => {
		const result = validateIconReference({ iconSet: "lucide", iconName: "not-a-real-icon" });
		expect(result.ok).toBe(false);
	});

	it("rejects invalid icon sets", () => {
		const result = validateIconReference({ iconSet: "fontawesome", iconName: "star" });
		expect(result.ok).toBe(false);
	});

	it("accepts react-icons with prefix:name format", () => {
		const result = validateIconReference({
			iconSet: "react-icons",
			iconName: "lu:LuSearch",
		});
		expect(result.ok).toBe(true);
	});
});

describe("mergePageOtherWithDefaults", () => {
	it("applies design and icon defaults on empty other", () => {
		const merged = mergePageOtherWithDefaults({});
		expect(merged.design?.fontFamily).toBe("system-ui");
		expect(merged.icons?.defaultSet).toBe("lucide");
		expect(merged.icons?.defaultSize).toBe(24);
	});
});

describe("validatePageOtherForSave", () => {
	it("rejects invalid page icon default set", () => {
		const result = validatePageOtherForSave({
			icons: { defaultSet: "invalid-set" },
		});
		expect(result.ok).toBe(false);
	});
});

describe("validateContentForSave", () => {
	it("rejects invalid group tagName", () => {
		const result = validateContentForSave({
			contentType: "page",
			blocks: [
				{
					id: "g1",
					name: "core/group",
					type: "container",
					parentId: null,
					content: { kind: "structured", data: { tagName: "marquee" } },
				},
			],
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("INVALID_BLOCK_TAG");
		}
	});
});
