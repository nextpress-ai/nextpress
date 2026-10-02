import { describe, expect, it } from "vitest";
import { contentVersionAfterRewrite } from "../lib/content-version-after-rewrite";

describe("contentVersionAfterRewrite", () => {
	it("moves past the stored version when a repeat import sends version 0", () => {
		expect(contentVersionAfterRewrite(4)).toBe(5);
		expect(contentVersionAfterRewrite(0)).toBe(1);
		expect(contentVersionAfterRewrite(undefined)).toBe(1);
		expect(contentVersionAfterRewrite(null)).toBe(1);
	});
});
