import { describe, expect, it } from "vitest";
import { isPubliclyReadable } from "../lib/is-publicly-readable";

describe("isPubliclyReadable", () => {
	it("allows published documents with no password", () => {
		expect(isPubliclyReadable({ status: "publish", password: null })).toBe(true);
		expect(isPubliclyReadable({ status: "publish", password: "" })).toBe(true);
	});

	it("rejects drafts, private, trash, and missing status", () => {
		expect(isPubliclyReadable({ status: "draft" })).toBe(false);
		expect(isPubliclyReadable({ status: "private" })).toBe(false);
		expect(isPubliclyReadable({ status: "trash" })).toBe(false);
		expect(isPubliclyReadable({ status: null })).toBe(false);
	});

	it("rejects published documents that still have a password", () => {
		expect(isPubliclyReadable({ status: "publish", password: "secret" })).toBe(false);
		expect(isPubliclyReadable({ status: "publish", password: "  " })).toBe(true);
	});
});
