import { describe, expect, it } from "vitest";
import { getBlockStackLayerWrapperStyles } from "@shared/block-container-placement";

describe("getBlockStackLayerWrapperStyles", () => {
	it("returns empty styles when stackLayer is unset", () => {
		expect(getBlockStackLayerWrapperStyles({})).toEqual({});
		expect(getBlockStackLayerWrapperStyles({ other: {} })).toEqual({});
	});

	it("maps stackLayer to relative positioning and z-index", () => {
		expect(getBlockStackLayerWrapperStyles({ other: { stackLayer: 3 } })).toEqual({
			position: "relative",
			zIndex: 3,
		});
	});

	it("supports negative stack layers for behind siblings", () => {
		expect(getBlockStackLayerWrapperStyles({ other: { stackLayer: -1 } })).toEqual({
			position: "relative",
			zIndex: -1,
		});
	});
});
