import { describe, expect, it } from "vitest";
import { hasCappedWidth, maxWidthPositionStyles, readMaxWidthPosition } from "./max-width-position";

describe("max width position", () => {
	it("only applies once a real max width is set", () => {
		expect(hasCappedWidth({ maxWidth: "1080px" })).toBe(true);
		expect(hasCappedWidth({ maxWidth: "100%" })).toBe(false);
		expect(hasCappedWidth({})).toBe(false);
	});

	it("reads the position from the auto side margins", () => {
		expect(readMaxWidthPosition({ marginLeft: "auto", marginRight: "auto" })).toBe("center");
		expect(readMaxWidthPosition({ marginLeft: "auto" })).toBe("right");
		expect(readMaxWidthPosition({ marginRight: "auto" })).toBe("left");
		expect(readMaxWidthPosition({})).toBeNull();
	});

	it("centring fills up to the max width and uses auto margins; a fixed width is kept", () => {
		expect(maxWidthPositionStyles({ position: "center", styles: { maxWidth: "1080px" } })).toEqual({
			width: "100%",
			marginLeft: "auto",
			marginRight: "auto",
		});
		expect(maxWidthPositionStyles({ position: "right", styles: { width: "640px", maxWidth: "100%" } })).toEqual({
			marginLeft: "auto",
			marginRight: null,
		});
		expect(maxWidthPositionStyles({ position: "left", styles: { width: "100%" } })).toEqual({
			width: "100%",
			marginLeft: null,
			marginRight: "auto",
		});
	});
});
