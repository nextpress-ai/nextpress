import { describe, expect, it } from "vitest";
import { collectCanvasColors, colorSwatchKey } from "./collect-canvas-colors";
import type { BlockConfig } from "./schema-types";

const heading = (over: Partial<BlockConfig> = {}): BlockConfig => ({
	id: "h1",
	name: "core/heading",
	type: "block",
	parentId: null,
	content: { kind: "text", value: "Hello" },
	...over,
});

describe("collectCanvasColors", () => {
	it("finds unique solids and a gradient, including the gradient's stop colours", () => {
		const items = collectCanvasColors([
			heading({
				styles: { color: "#111111", backgroundColor: "#111111" },
				other: {
					fills: {
						background: {
							kind: "gradient",
							shape: "linear",
							angle: 180,
							stops: [
								{ color: "#ff0000", position: 0 },
								{ color: "#0000ff", position: 100 },
							],
						},
					},
				},
			}),
		]);
		const solids = items.filter((item) => item.kind === "solid").map((item) => item.color);
		const gradients = items.filter((item) => item.kind === "gradient");
		expect(solids).toEqual(["#111111", "#ff0000", "#0000ff"]);
		expect(gradients).toHaveLength(1);
		expect(colorSwatchKey(gradients[0]!).startsWith("g:")).toBe(true);
	});

	it("treats the same hex in different case as one colour", () => {
		const items = collectCanvasColors([
			heading({ styles: { color: "#FFF", backgroundColor: "#fff" } }),
		]);
		expect(items.filter((item) => item.kind === "solid")).toEqual([{ kind: "solid", color: "#fff" }]);
	});
});
