import { describe, expect, it } from "vitest";
import {
	buildTextFillCss,
	fillToBackgroundStyles,
	fillToImageValue,
	readBlockFills,
	readFill,
	resolveBlockFills,
	safeImageUrl,
	type Fill,
} from "./fill-model";
import type { BlockConfig } from "./schema-types";
import { resolveBlockForSurface } from "./resolve-block-for-surface";
import { collectBlockExtraCss } from "./collect-block-extra-css";
import { buildPageShellOuterStyle } from "./page-shell-styles";
import { DEFAULT_PAGE_SHELL_CONTENT, readPageShellContent } from "./page-shell-model";
import { GRADIENT_PRESETS, DEFAULT_GRADIENT_FILL, imageFillFromUrl } from "./gradient-presets";

const gradient = (over: Record<string, unknown> = {}) => ({
	kind: "gradient",
	shape: "linear",
	angle: 90,
	stops: [
		{ color: "#ff0000", position: 0 },
		{ color: "#0000ff", position: 100 },
	],
	...over,
});

describe("reading saved fills", () => {
	it("keeps a good gradient and sorts its stops", () => {
		const fill = readFill(
			gradient({
				stops: [
					{ color: "#0000ff", position: 100 },
					{ color: "#ff0000", position: 0 },
				],
			}),
		);
		expect(fill).toMatchObject({ kind: "gradient", angle: 90 });
		expect((fill as { stops: { position: number }[] }).stops.map((s) => s.position)).toEqual([0, 100]);
	});

	it("drops unsafe colours and needs two left to stay a gradient", () => {
		expect(readFill(gradient({ stops: [{ color: "red;}body{x:y", position: 0 }, { color: "#fff", position: 100 }] }))).toBeUndefined();
		expect(readFill(gradient({ stops: [{ color: "#fff", position: 0 }] }))).toBeUndefined();
		const many = readFill(
			gradient({
				stops: Array.from({ length: 9 }, (_, i) => ({ color: "#123456", position: i * 10 })),
			}),
		) as { stops: unknown[] };
		expect(many.stops).toHaveLength(4);
	});

	it("clamps angle and stop positions, and falls back on unknown shapes", () => {
		const fill = readFill(
			gradient({ angle: 9000, shape: "spiral", stops: [{ color: "#111", position: -5 }, { color: "#222", position: 500 }] }),
		) as { angle: number; shape: string; stops: { position: number }[] };
		expect(fill.angle).toBe(360);
		expect(fill.shape).toBe("linear");
		expect(fill.stops.map((s) => s.position)).toEqual([0, 100]);
	});

	it("only accepts pictures from this site or https, with no quotes or brackets", () => {
		expect(safeImageUrl("/uploads/a.png")).toBe("/uploads/a.png");
		expect(safeImageUrl("https://cdn.example.com/a.png")).toBe("https://cdn.example.com/a.png");
		for (const bad of [
			"//evil.test/a.png",
			"http://insecure.test/a.png",
			"javascript:alert(1)",
			'/a.png"),url(//evil',
			"/a b.png",
			"data:image/png;base64,AAAA",
			"",
			42,
		]) {
			expect(safeImageUrl(bad as string), String(bad)).toBeUndefined();
		}
		expect(readFill({ kind: "image", url: "javascript:alert(1)" })).toBeUndefined();
	});

	it("reads image options with safe defaults, and ignores a zero tint", () => {
		const fill = readFill({ kind: "image", url: "/uploads/a.png", size: "huge", position: "middle", tint: { tone: "dark", strength: 0 } });
		expect(fill).toEqual({ kind: "image", url: "/uploads/a.png", size: "cover", position: "center", repeat: false, tint: undefined });
	});

	it("reads a block's fills, ignoring junk", () => {
		expect(readBlockFills(undefined)).toEqual({});
		expect(readBlockFills({ background: gradient(), text: { kind: "nope" } })).toEqual({
			background: expect.objectContaining({ kind: "gradient" }),
		});
	});
});

describe("fill CSS", () => {
	it("writes linear, radial and conic gradients", () => {
		expect(fillToImageValue(readFill(gradient()) as Fill)).toBe("linear-gradient(90deg, #ff0000 0%, #0000ff 100%)");
		expect(fillToImageValue(readFill(gradient({ shape: "radial" })) as Fill)).toBe(
			"radial-gradient(circle at center, #ff0000 0%, #0000ff 100%)",
		);
		expect(fillToImageValue(readFill(gradient({ shape: "conic", angle: 45 })) as Fill)).toBe(
			"conic-gradient(from 45deg at center, #ff0000 0%, #0000ff 100%)",
		);
	});

	it("puts a picture's tint above it and paints size, position and repeat", () => {
		const fill = readFill({ kind: "image", url: "/uploads/a.png", size: "contain", position: "top left", repeat: true, tint: { tone: "dark", strength: 40 } }) as Fill;
		expect(fillToImageValue(fill)).toBe('linear-gradient(rgb(0 0 0 / 40%), rgb(0 0 0 / 40%)), url("/uploads/a.png")');
		expect(fillToBackgroundStyles(fill)).toMatchObject({
			backgroundSize: "contain",
			backgroundPosition: "top left",
			backgroundRepeat: "repeat",
		});
		const light = readFill({ kind: "image", url: "/a.png", tint: { tone: "light", strength: 20 } }) as Fill;
		expect(fillToImageValue(light)).toContain("rgb(255 255 255 / 20%)");
	});

	it("text fills only apply where clipping works and step aside in high contrast", () => {
		const css = buildTextFillCss({ selector: ".block-x", fill: readFill(gradient()) });
		expect(css).toContain("@supports (background-clip:text) or (-webkit-background-clip:text){");
		expect(css).toContain(".block-x{background-image:linear-gradient(90deg, #ff0000 0%, #0000ff 100%)");
		expect(css).toContain("-webkit-text-fill-color:transparent");
		expect(css).toContain("@media (forced-colors:active){");
		expect(css).toContain("-webkit-text-fill-color:currentColor;color:CanvasText");
		expect(buildTextFillCss({ selector: ".x", fill: undefined })).toBe("");
	});

	it("a text fill replaces the background fill on the same block", () => {
		const both = resolveBlockFills({ blockId: "b1", fills: { background: gradient(), text: gradient({ angle: 10 }) } });
		expect(both.styles).toEqual({});
		expect(both.css).toContain(".block-b1{");
		const bgOnly = resolveBlockFills({ blockId: "b1", fills: { background: gradient() } });
		expect(bgOnly.styles.backgroundImage).toContain("linear-gradient(90deg");
		expect(bgOnly.css).toBe("");
		expect(resolveBlockFills({ blockId: "b1", fills: undefined })).toEqual({ styles: {}, css: "" });
	});
});

describe("presets", () => {
	it("every preset is a valid fill and the theme one follows the accent", () => {
		expect(GRADIENT_PRESETS).toHaveLength(12);
		for (const preset of GRADIENT_PRESETS) {
			expect(readFill(preset.fill), preset.id).toEqual(preset.fill);
		}
		expect(GRADIENT_PRESETS[0]!.fill.stops[0]!.color).toContain("--npb-accent");
		expect(readFill(DEFAULT_GRADIENT_FILL)).toBeDefined();
		expect(imageFillFromUrl("/uploads/a.png")).toMatchObject({ kind: "image", size: "cover" });
	});
});

describe("fills on blocks and the page shell", () => {
	const block = (other: Record<string, unknown>) =>
		({
			id: "b9",
			name: "core/heading",
			type: "block",
			parentId: null,
			content: { kind: "text", value: "Hi" },
			styles: { color: "#111111" },
			settings: {},
			other,
			children: [],
		}) as unknown as BlockConfig;

	it("a background fill lands in the block's inline styles on every surface", () => {
		for (const surface of ["canvas", "preview", "publish"] as const) {
			const { inlineStyles } = resolveBlockForSurface({ block: block({ fills: { background: gradient() } }), surface });
			expect(inlineStyles.backgroundImage, surface).toContain("linear-gradient(90deg");
			expect(inlineStyles.color).toBe("#111111");
		}
	});

	it("a text fill becomes a CSS fragment, and unsafe saved fills paint nothing", () => {
		const { inlineStyles, cssFragments } = resolveBlockForSurface({
			block: block({ fills: { text: gradient() } }),
			surface: "publish",
		});
		expect(inlineStyles.backgroundImage).toBeUndefined();
		expect(cssFragments.join("\n")).toContain(".block-b9{");
		const bad = resolveBlockForSurface({
			block: block({ fills: { background: { kind: "image", url: 'javascript:alert(1)' } } }),
			surface: "publish",
		});
		expect(bad.inlineStyles.backgroundImage).toBeUndefined();
	});

	it("collects text-fill CSS from nested blocks for a published page", () => {
		const inner = block({ fills: { text: gradient() } });
		const outer = { ...block({}), id: "outer", children: [inner] } as BlockConfig;
		expect(collectBlockExtraCss([outer])).toContain(".block-b9{");
		expect(collectBlockExtraCss([block({})])).toBe("");
	});

	it("the shell paints its background fill over its colour", () => {
		const style = buildPageShellOuterStyle({
			content: { ...DEFAULT_PAGE_SHELL_CONTENT, backgroundFill: readFill(gradient()) },
		});
		expect(style.backgroundImage).toContain("linear-gradient(90deg");
		expect(readPageShellContent({ kind: "structured", data: { backgroundFill: gradient() } } as never).backgroundFill?.kind).toBe("gradient");
		expect(readPageShellContent({ kind: "structured", data: { backgroundFill: { kind: "image", url: "javascript:1" } } } as never).backgroundFill).toBeUndefined();
	});
});
