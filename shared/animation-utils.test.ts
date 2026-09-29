import { describe, expect, it } from "vitest";
import {
	generateBlockAnimationCSS,
	generateHoverAnimationCSS,
	generateLoopAnimationCSS,
	getEntryAnimationBaseCSS,
	usesAnimateCss,
} from "./animation-utils.js";
import { buildMovingFillCss, readFill, resolveBlockFills } from "./fill-model.js";
import { safeCssLength } from "./css-safe.js";

const REDUCED = "@media (prefers-reduced-motion: no-preference)";

describe("loop animations", () => {
	it("keeps Animate.css loops at their old 1s pace unless a speed is set", () => {
		const css = generateLoopAnimationCSS("b1", { name: "pulse" }, false);
		expect(css).toContain(".block-b1{animation:pulse 1000ms ease infinite normal both}");
		expect(generateLoopAnimationCSS("b1", { name: "pulse", durationMs: 2500 }, false)).toContain("pulse 2500ms");
	});

	it("orbits at its radius and turns the start angle into a head start", () => {
		const css = generateLoopAnimationCSS(
			"icon",
			{ name: "np-orbit", durationMs: 24_000, orbitRadius: "180px", orbitStart: 90 },
			false,
		);
		expect(css).toContain("@keyframes np-orbit");
		expect(css).toContain("animation:np-orbit 24000ms linear infinite normal both");
		expect(css).toContain("--np-orbit-radius:180px");
		expect(css).toContain("animation-delay:-6000ms");
	});

	it("turns the other way and floats with an ease", () => {
		expect(generateLoopAnimationCSS("s", { name: "np-spin", reverse: true }, false)).toContain(
			"np-spin 12000ms linear infinite reverse",
		);
		expect(generateLoopAnimationCSS("f", { name: "np-float" }, false)).toContain("np-float 4000ms ease-in-out");
	});

	it("stops for visitors who ask for less motion", () => {
		expect(generateLoopAnimationCSS("b", { name: "np-float" }, false).startsWith(REDUCED)).toBe(true);
		expect(getEntryAnimationBaseCSS().startsWith(REDUCED)).toBe(true);
	});

	it("never writes unsafe names or radii into CSS", () => {
		expect(generateLoopAnimationCSS("b", { name: "x}body{display:none" }, false)).toBe("");
		expect(generateLoopAnimationCSS("b", { name: "np-orbit", orbitRadius: "1px;}body{" }, false)).toContain(
			"--np-orbit-radius:140px",
		);
		expect(safeCssLength("30%")).toBe("30%");
		expect(safeCssLength("calc(1px + 2px)")).toBeUndefined();
	});

	it("lets a ring shrink on small screens with min(), and nothing fancier", () => {
		expect(generateLoopAnimationCSS("r", { name: "np-orbit", orbitRadius: "min(220px, 40vw)" }, false)).toContain(
			"--np-orbit-radius:min(220px, 40vw)",
		);
		expect(generateLoopAnimationCSS("r", { name: "np-orbit", orbitRadius: "min(1px, calc(2px))" }, false)).toContain(
			"--np-orbit-radius:140px",
		);
	});

	it("waits for the entry animation before looping", () => {
		expect(generateBlockAnimationCSS("b", { entry: { name: "fadeIn" }, loop: { name: "np-float" } })).toContain(
			".block-b.np-entry-played{",
		);
	});
});

describe("hover looks", () => {
	it("lifts only on devices with a real pointer, and eases", () => {
		const css = generateHoverAnimationCSS("card", { name: "np-lift" });
		expect(css).toContain("@media (hover:hover) and (pointer:fine){.block-card:hover{transform:translateY(-3px)");
		expect(css).toContain("transition:transform 180ms");
	});

	it("only asks for the Animate.css file when a block really uses it", () => {
		expect(usesAnimateCss({ hover: { name: "np-lift" }, loop: { name: "np-orbit" } })).toBe(false);
		expect(usesAnimateCss({ loop: { name: "pulse" } })).toBe(true);
		expect(usesAnimateCss({ entry: { name: "fadeInUp" } })).toBe(true);
	});
});

describe("drifting gradient backgrounds", () => {
	const stops = [
		{ color: "#0b0e13", position: 0 },
		{ color: "#3b4a5e", position: 100 },
	];

	it("reads a saved drift and keeps its speed in range", () => {
		const fill = readFill({ kind: "gradient", shape: "radial", angle: 0, stops, motion: { kind: "drift", seconds: 4 } });
		expect(fill).toMatchObject({ motion: { kind: "drift", seconds: 8 } });
		expect(readFill({ kind: "gradient", shape: "linear", angle: 0, stops, motion: null })).not.toHaveProperty("motion");
	});

	it("paints a drifting gradient on a layer behind the block, not inline", () => {
		const { styles, css } = resolveBlockFills({
			blockId: "ai",
			fills: { background: { kind: "gradient", shape: "radial", angle: 0, stops, motion: { kind: "drift", seconds: 30 } } },
		});
		expect(styles).toEqual({});
		expect(css).toContain(".block-ai{position:relative;isolation:isolate;overflow:hidden}");
		expect(css).toContain(".block-ai::before{");
		expect(css).toContain("radial-gradient(circle at center, #0b0e13 0%, #3b4a5e 100%)");
		expect(css).toContain(`${REDUCED}{.block-ai::before{animation:np-fill-drift 30s linear infinite}}`);
		// The layer stays close to the block's size so the gradient keeps its real colours.
		expect(css).toContain("inset:-15%");
		expect(css).not.toContain("vmax");
	});

	it("leaves a still gradient inline, as before", () => {
		const { styles, css } = resolveBlockFills({
			blockId: "still",
			fills: { background: { kind: "gradient", shape: "linear", angle: 180, stops } },
		});
		expect(styles.backgroundImage).toContain("linear-gradient(180deg");
		expect(css).toBe("");
		expect(buildMovingFillCss({ selector: ".x", fill: { kind: "gradient", shape: "linear", angle: 0, stops } })).toContain(
			"np-fill-drift 30s",
		);
	});
});

describe("visitor view collects animation CSS for nested blocks", () => {
	it("includes a nested block's orbit rule once", async () => {
		const { resolveBlockTreeForSurface } = await import("./resolve-block-for-surface.js");
		const child = {
			id: "icon-1",
			name: "core/icon",
			type: "block" as const,
			parentId: "g",
			content: { kind: "structured" as const, data: {} },
			other: { animation: { loop: { name: "np-orbit", orbitRadius: "120px" } } },
		};
		const { css } = resolveBlockTreeForSurface({
			blocks: [{ id: "g", name: "core/group", type: "container", parentId: null, content: { kind: "structured", data: {} }, children: [child] }],
			surface: "publish",
		});
		expect(css.match(/\.block-icon-1\{animation:np-orbit/g)).toHaveLength(1);
	});
});
