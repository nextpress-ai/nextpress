import { describe, it, expect } from "vitest";
import { resolveCreatePageError, resolveDuplicatePageError, resolvePluginError } from "@/lib/sonner-toast";

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

describe("resolveDuplicatePageError", () => {
	it("asks for a different name when that URL is taken", () => {
		const error = Object.assign(new Error("Slug taken"), {
			status: 409,
			code: "PAGE_SLUG_EXISTS",
		});
		expect(resolveDuplicatePageError(error)).toBe(
			"A page with that name already exists. Choose a different name.",
		);
	});

	it("says the page is gone on 404", () => {
		const error = Object.assign(new Error("Page not found"), { status: 404 });
		expect(resolveDuplicatePageError(error)).toBe("That page is gone. Refresh the list and try again.");
	});
});

describe("resolvePluginError", () => {
	it("asks for a different name when that name is taken", () => {
		const error = Object.assign(new Error("Name taken"), {
			status: 409,
			code: "PLUGIN_NAME_EXISTS",
		});
		expect(resolvePluginError(error)).toBe(
			"A plugin with that name already exists. Choose a different name.",
		);
	});

	it("says the plugin is gone on 404", () => {
		const error = Object.assign(new Error("Missing"), { status: 404 });
		expect(resolvePluginError(error)).toBe("That plugin is gone. Refresh the list and try again.");
	});
});
