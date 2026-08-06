import { describe, expect, it } from "vitest";
import { validateContentForSave } from "../../../validate-content-save.js";
import { demoPageDefinitions } from "./index.js";

describe("demo page fixtures", () => {
	for (const def of demoPageDefinitions) {
		it(`validates ${def.key} (${def.slug})`, () => {
			const result = validateContentForSave({ blocks: def.blocks, contentType: "page" });
			expect(result.ok).toBe(true);
		});
	}

	it("has unique slugs", () => {
		const slugs = demoPageDefinitions.map((d) => d.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
	});
});
