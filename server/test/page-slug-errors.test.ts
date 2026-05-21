import { describe, it, expect } from "vitest";
import {
	collectErrorText,
	isPageSlugConflictError,
	normalizePageSlug,
} from "../utils";

describe("page slug error helpers", () => {
	it("normalizes slugs consistently before uniqueness checks", () => {
		expect(normalizePageSlug("  About Us!!  ")).toBe("about-us");
		expect(normalizePageSlug("Hello--World")).toBe("hello-world");
	});

	it("reads duplicate details from drizzle error.cause chains", () => {
		const drizzleError = Object.assign(new Error("Failed query: insert into pages"), {
			cause: Object.assign(new Error('duplicate key value violates unique constraint "pages_slug_unique"'), {
				code: "23505",
			}),
		});

		expect(collectErrorText(drizzleError)).toMatch(/pages_slug_unique/);
		expect(isPageSlugConflictError(drizzleError)).toBe(true);
	});

	it("detects app-level slug conflict messages", () => {
		expect(isPageSlugConflictError(new Error('Slug "home" already exists'))).toBe(
			true,
		);
	});
});
