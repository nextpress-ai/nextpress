import { describe, expect, it } from "vitest";
import { buildHeaderScrollCss, readHeaderScrollLook } from "./header-scroll-model";

const gradient = {
	kind: "gradient" as const,
	shape: "linear" as const,
	angle: 90,
	stops: [
		{ color: "#111111", position: 0 },
		{ color: "#eeeeee", position: 100 },
	],
};

describe("header scroll look", () => {
	it("reads a gradient fill and writes it onto the scrolled bar", () => {
		const look = readHeaderScrollLook({ backgroundFill: gradient });
		expect(look?.backgroundFill).toMatchObject({ kind: "gradient", angle: 90 });
		const css = buildHeaderScrollCss({ blockId: "hdr", look });
		expect(css).toContain(".block-hdr .wp-block-header.is-scrolled");
		expect(css).toContain("linear-gradient(90deg, #111111 0%, #eeeeee 100%)");
	});

	it("fades a fill on its own layer so the words stay solid", () => {
		const look = readHeaderScrollLook({ backgroundFill: gradient, opacity: 40 });
		const css = buildHeaderScrollCss({ blockId: "hdr", look });
		expect(css).toContain(".block-hdr .wp-block-header.is-scrolled::before");
		expect(css).toContain("opacity:0.4");
		expect(css).toContain("linear-gradient(90deg, #111111 0%, #eeeeee 100%)");
	});
});
