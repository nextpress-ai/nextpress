import { describe, it, expect } from "vitest";
import { buildImportedWpMap } from "./build-imported-wp-map";

describe("buildImportedWpMap", () => {
	it("maps wpId to NextPress id for matching WordPress domain", () => {
		const map = buildImportedWpMap({
			domain: "https://walkableca.com",
			items: [
				{
					id: "np-page-1",
					other: {
						import: {
							source: "wordpress",
							domain: "https://walkableca.com",
							wpId: 2315,
							wpLink: "https://walkableca.com/page/",
							importedAt: "2024-01-01T00:00:00.000Z",
							raw: { id: 2315 },
						},
					},
				},
				{
					id: "np-post-2",
					other: {
						import: {
							source: "wordpress",
							domain: "https://other.com",
							wpId: 99,
							wpLink: "https://other.com/post/",
							importedAt: "2024-01-01T00:00:00.000Z",
							raw: { id: 99 },
						},
					},
				},
			],
		});

		expect(map.size).toBe(1);
		expect(map.get(2315)).toEqual({ nextpressId: "np-page-1" });
	});

	it("ignores items without WordPress import metadata", () => {
		const map = buildImportedWpMap({
			domain: "https://example.com",
			items: [{ id: "local-1", other: { categories: ["News"] } }],
		});

		expect(map.size).toBe(0);
	});
});
