import { describe, expect, it } from "vitest";
import { countTaxonomyTerms } from "./taxonomy";

/**
 * Categories and tags have no table: they are counted from the posts that name them, so a list is
 * only as good as the way posts spell them.
 */
describe("countTaxonomyTerms", () => {
	it("counts a term once per post and sorts the most used first", () => {
		const posts = [
			{ other: { categories: ["News", "Release"] } },
			{ other: { categories: ["News", "Guides"] } },
			{ other: { categories: ["News"] } },
		];
		expect(countTaxonomyTerms({ posts, field: "categories" })).toEqual([
			{ name: "News", count: 3 },
			{ name: "Guides", count: 1 },
			{ name: "Release", count: 1 },
		]);
	});

	it("treats spellings that differ only by capitals and spacing as one term", () => {
		const posts = [
			{ other: { tags: ["Release Notes"] } },
			{ other: { tags: [" release notes "] } },
			{ other: { tags: ["RELEASE NOTES"] } },
		];
		expect(countTaxonomyTerms({ posts, field: "tags" })).toEqual([
			{ name: "Release Notes", count: 3 },
		]);
	});

	it("reads the flat categories the API adds as well as the stored other field", () => {
		const posts = [{ categories: ["Flat"] }, { other: { categories: ["Stored"] } }];
		expect(countTaxonomyTerms({ posts, field: "categories" })).toEqual([
			{ name: "Flat", count: 1 },
			{ name: "Stored", count: 1 },
		]);
	});

	it("counts a post once even when it names the same term twice", () => {
		expect(countTaxonomyTerms({ posts: [{ other: { tags: ["Docs", "docs"] } }], field: "tags" })).toEqual([
			{ name: "Docs", count: 1 },
		]);
	});

	it("ignores missing, empty and non-text names", () => {
		const posts = [{}, { other: null }, { other: { tags: [] } }, { other: { tags: ["", "  ", 5] } }];
		expect(countTaxonomyTerms({ posts, field: "tags" })).toEqual([]);
	});
});
