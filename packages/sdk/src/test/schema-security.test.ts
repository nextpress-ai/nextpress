import { describe, expect, it } from "vitest";
import { parseInput } from "../client/validate-input.js";
import { blockContentSchema } from "../schemas/index.js";

describe("schema security", () => {
	it("rejects javascript: media URLs", () => {
		expect(() =>
			parseInput({
				schema: blockContentSchema,
				input: {
					kind: "media",
					url: "javascript:alert(1)",
					mediaType: "image",
				},
				label: "media content",
			}),
		).toThrow(/Media URL must be http|Invalid media content/);
	});

	it("accepts https and site-relative media URLs", () => {
		for (const url of ["https://cdn.example.com/a.png", "/uploads/a.png"]) {
			const result = parseInput({
				schema: blockContentSchema,
				input: { kind: "media", url, mediaType: "image" },
				label: "media content",
			});
			expect(result).toMatchObject({ kind: "media", url });
		}
	});
});
