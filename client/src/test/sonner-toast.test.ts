import { describe, it, expect } from "vitest";
import { resolveCreatePageError } from "@/lib/sonner-toast";

describe("resolveCreatePageError", () => {
	it("maps duplicate slug API responses to a clear message", () => {
		const error = Object.assign(
			new Error("This page already exists. Choose a different URL slug."),
			{ status: 409, code: "PAGE_SLUG_EXISTS" },
		);

		expect(resolveCreatePageError(error)).toBe(
			"This page already exists. Choose a different URL slug.",
		);
	});

	it("maps generic failed-query responses when status is 409", () => {
		const error = Object.assign(new Error("Failed query: insert into pages"), {
			status: 409,
			code: "PAGE_SLUG_EXISTS",
		});

		expect(resolveCreatePageError(error)).toBe(
			"This page already exists. Choose a different URL slug.",
		);
	});
});
