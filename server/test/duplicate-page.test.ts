import { describe, expect, it } from "vitest";
import {
	leftoverDesignForDuplicate,
	otherForDuplicatedPage,
	uniquePageSlug,
} from "../routes/shared/duplicate-page";

describe("uniquePageSlug", () => {
	it("uses the title when that URL is free", async () => {
		const slug = await uniquePageSlug({
			title: "Copy of Home",
			isTaken: async () => false,
		});
		expect(slug).toBe("copy-of-home");
	});

	it("adds a number when the first URL is taken", async () => {
		const taken = new Set(["copy-of-home", "copy-of-home-2"]);
		const slug = await uniquePageSlug({
			title: "Copy of Home",
			isTaken: async (candidate) => taken.has(candidate),
		});
		expect(slug).toBe("copy-of-home-3");
	});
});

describe("otherForDuplicatedPage", () => {
	it("keeps the look and drops blog landing flags", () => {
		const other = otherForDuplicatedPage({
			isBlogPage: true,
			blogId: "blog-1",
			design: { containerWidth: "1200px" },
		});
		expect(other.isBlogPage).toBeUndefined();
		expect(other.blogId).toBeUndefined();
		expect(other.design).toEqual({ containerWidth: "1200px" });
		expect(leftoverDesignForDuplicate({ design: { containerWidth: "1200px" } })?.containerWidth).toBe(
			"1200px",
		);
	});
});
