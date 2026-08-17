import { describe, expect, it } from "vitest";
import {
	headingLevelFromTag,
	isPreviewableContentStatus,
	readBlockContentData,
	readStructuredBlockData,
} from "./read-block-content.js";

describe("readBlockContentData", () => {
	it("unwraps structured data", () => {
		expect(
			readBlockContentData({ kind: "structured", data: { text: "Hello" } }),
		).toEqual({ text: "Hello" });
	});

	it("unwraps text and media kinds", () => {
		expect(readBlockContentData({ kind: "text", value: "Hi", level: 2 })).toEqual({
			value: "Hi",
			level: 2,
		});
		expect(
			readBlockContentData({ kind: "media", url: "/a.jpg", alt: "Hero" }),
		).toEqual({ url: "/a.jpg", alt: "Hero" });
	});
});

describe("readStructuredBlockData", () => {
	it("merges structured and unwrapped editor models with defaults", () => {
		const defaults = { text: "Default", count: 0 };
		expect(
			readStructuredBlockData(
				{ kind: "structured", data: { text: "Hello" } },
				defaults,
			),
		).toEqual({ text: "Hello", count: 0 });
		expect(readStructuredBlockData({ text: "Saved" }, defaults)).toEqual({
			text: "Saved",
			count: 0,
		});
	});
});

describe("headingLevelFromTag", () => {
	it("maps h-tags and numeric levels", () => {
		expect(headingLevelFromTag("h1", 2)).toBe(1);
		expect(headingLevelFromTag(3, 2)).toBe(3);
		expect(headingLevelFromTag("div", 2)).toBe(2);
	});
});

describe("isPreviewableContentStatus", () => {
	it("allows draft, preview, and publish", () => {
		expect(isPreviewableContentStatus("draft")).toBe(true);
		expect(isPreviewableContentStatus("preview")).toBe(true);
		expect(isPreviewableContentStatus("publish")).toBe(true);
		expect(isPreviewableContentStatus("trash")).toBe(false);
		expect(isPreviewableContentStatus(undefined)).toBe(false);
	});
});
