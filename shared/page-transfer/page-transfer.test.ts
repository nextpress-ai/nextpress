import { describe, expect, it } from "vitest";
import type { BlockConfig } from "../schema-types";
import {
	buildPlaceholderSvg,
	decideFileTravel,
	findUploadRefs,
	placePastedBlocks,
	readPagePackage,
	rewriteFileRefs,
	CLIPBOARD_TOTAL_MAX_BYTES,
	type PagePackage,
} from "./index";
import { sanitizeSvgMarkup } from "../icon-drawing";

const block = (over: Partial<BlockConfig> & { id: string }): BlockConfig => ({
	name: "core/image",
	type: "block",
	parentId: null,
	content: { kind: "text", value: "" },
	...over,
});

const shell = (id: string, children: BlockConfig[]): BlockConfig => ({
	id,
	name: "core/page-shell",
	type: "container",
	parentId: null,
	content: { kind: "structured", data: {} },
	children: children.map((child) => ({ ...child, parentId: id })),
});

const counter = () => {
	let n = 0;
	return () => `new-${++n}`;
};

describe("findUploadRefs", () => {
	it("finds paths in content, inside url() fills, and in page extras", () => {
		const refs = findUploadRefs({
			value: {
				blocks: [
					block({ id: "a", content: { kind: "media", url: "/uploads/hero-1.jpg", mediaType: "image" } }),
					block({ id: "b", styles: { backgroundImage: 'url("/uploads/bg%20wide-2.png")' } }),
				],
				featuredImage: "http://localhost:5000/uploads/cover-3.webp",
			},
		});
		expect(refs.sort()).toEqual(["/uploads/bg wide-2.png", "/uploads/cover-3.webp", "/uploads/hero-1.jpg"]);
	});

	it("catches a library file whose name has spaces when the library is known", () => {
		const refs = findUploadRefs({
			value: { src: "/uploads/team photo-9.jpg" },
			knownUrls: ["/uploads/team photo-9.jpg", "/uploads/unused-1.png"],
		});
		expect(refs).toContain("/uploads/team photo-9.jpg");
		expect(refs).not.toContain("/uploads/unused-1.png");
	});
});

describe("rewriteFileRefs", () => {
	it("swaps every mention, drops the old host, and leaves longer names alone", () => {
		const value = {
			src: "/uploads/a.png",
			fill: 'url("http://localhost:5000/uploads/a.png")',
			other: "/uploads/a.png.bak",
			encoded: "/uploads/my%20file.png",
		};
		const next = rewriteFileRefs({
			value,
			refMap: { "/uploads/a.png": "/uploads/a-99.png", "/uploads/my file.png": "/uploads/my-file-7.png" },
		});
		expect(next).toEqual({
			src: "/uploads/a-99.png",
			fill: 'url("/uploads/a-99.png")',
			other: "/uploads/a.png.bak",
			encoded: "/uploads/my-file-7.png",
		});
		expect(value.src).toBe("/uploads/a.png");
	});
});

describe("readPagePackage", () => {
	const valid: PagePackage = {
		format: "nextpress-page",
		formatVersion: 1,
		appVersion: "1.3.8",
		createdAt: "2026-09-29T00:00:00.000Z",
		source: "export",
		page: { title: "Walkable", slug: "walkableca", featuredImage: null, other: {} },
		blocks: [shell("s", [block({ id: "i" })])],
		files: [{ ref: "/uploads/a.png", name: "a.png", mimeType: "image/png", size: 3, data: "AAAA" }],
	};

	it("reads a page file", () => {
		const result = readPagePackage(JSON.stringify(valid));
		expect(result.ok && result.value.page?.slug).toBe("walkableca");
	});

	it("refuses other text, damaged files, newer formats and paths outside uploads", () => {
		expect(readPagePackage("hello").ok).toBe(false);
		expect(readPagePackage('{"format":"nextpress-page",').ok).toBe(false);
		const newer = readPagePackage(JSON.stringify({ ...valid, formatVersion: 3 }));
		expect(!newer.ok && newer.message).toContain("newer NextPress");
		const sneaky = { ...valid, files: [{ ...valid.files[0]!, ref: "/etc/passwd" }] };
		expect(readPagePackage(JSON.stringify(sneaky)).ok).toBe(false);
	});
});

describe("decideFileTravel", () => {
	const uploadLimit = 10 * 1024 * 1024;

	it("page file carries every allowed file unless files are left out", () => {
		expect(decideFileTravel({ mode: "export", mimeType: "video/mp4", size: 5_000_000, uploadLimit })).toEqual({ travels: true });
		expect(decideFileTravel({ mode: "export-without-files", mimeType: "image/png", size: 10, uploadLimit })).toEqual({
			travels: false,
			leftOut: "left-out",
		});
		expect(decideFileTravel({ mode: "export", mimeType: "image/png", size: uploadLimit + 1, uploadLimit })).toEqual({
			travels: false,
			leftOut: "too-large",
		});
	});

	it("clipboard carries small images only, within a running total", () => {
		expect(decideFileTravel({ mode: "clipboard", mimeType: "image/png", size: 1000, uploadLimit })).toEqual({ travels: true });
		expect(decideFileTravel({ mode: "clipboard", mimeType: "video/mp4", size: 1000, uploadLimit })).toEqual({
			travels: false,
			leftOut: "not-in-clipboard",
		});
		expect(
			decideFileTravel({
				mode: "clipboard",
				mimeType: "image/png",
				size: 1000,
				uploadLimit,
				clipboardBytesSoFar: CLIPBOARD_TOTAL_MAX_BYTES,
			}),
		).toEqual({ travels: false, leftOut: "not-in-clipboard" });
	});
});

describe("buildPlaceholderSvg", () => {
	it("names the file safely and passes the SVG cleaner", () => {
		const svg = buildPlaceholderSvg({ name: 'hero <script>"x".mp4' });
		expect(svg).toContain("Missing file");
		expect(svg).not.toContain("<script>");
		expect(sanitizeSvgMarkup(svg).ok).toBe(true);
	});
});

describe("placePastedBlocks", () => {
	const current = [shell("here", [block({ id: "old" })])];
	const copiedPage = [shell("there", [block({ id: "p1" }), block({ id: "p2" })])];

	it("replace: the copied page, with its shell, becomes this page with fresh ids", () => {
		const next = placePastedBlocks({ current, pasted: copiedPage, mode: "replace", generateId: counter() });
		expect(next).toHaveLength(1);
		expect(next[0]!.name).toBe("core/page-shell");
		expect(next[0]!.id).not.toBe("there");
		expect(next[0]!.children?.map((child) => child.parentId)).toEqual([next[0]!.id, next[0]!.id]);
		expect(JSON.stringify(next)).not.toContain('"old"');
		expect(JSON.stringify(next)).not.toContain('"p1"');
	});

	it("append: keeps this page's shell and blocks, adds the copied blocks after them", () => {
		const next = placePastedBlocks({ current, pasted: copiedPage, mode: "append", generateId: counter() });
		expect(next[0]!.id).toBe("here");
		expect(next[0]!.children?.map((child) => child.id)).toEqual(["old", expect.any(String), expect.any(String)]);
		expect(next[0]!.children?.every((child) => child.parentId === "here")).toBe(true);
	});

	it("replace with loose blocks keeps this page's look and swaps its content", () => {
		const next = placePastedBlocks({ current, pasted: [block({ id: "solo" })], mode: "replace", generateId: counter() });
		expect(next[0]!.id).toBe("here");
		expect(next[0]!.children).toHaveLength(1);
		expect(next[0]!.children?.[0]?.id).not.toBe("solo");
	});
});
