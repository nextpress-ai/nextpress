import { describe, expect, it } from "vitest";
import { getBlockSiblingFlexItemStyles, readCappedFillWidth } from "./block-container-placement";

describe("fill up to a max width, inside centred or aligned stacks", () => {
	it("recognises only an explicit 100% width with a real max width", () => {
		expect(readCappedFillWidth({ width: "100%", maxWidth: "1080px" })).toBe("1080px");
		expect(readCappedFillWidth({ width: "100%" })).toBeNull();
		expect(readCappedFillWidth({ maxWidth: "1080px" })).toBeNull();
		expect(readCappedFillWidth({ width: "100%", maxWidth: "100%" })).toBeNull();
		expect(readCappedFillWidth({ width: "fit-content", maxWidth: "600px" })).toBeNull();
	});

	it("keeps the slot at the max width so a centring parent centres the block at that width", () => {
		expect(getBlockSiblingFlexItemStyles({ width: "100%", maxWidth: "1080px" }, "column")).toEqual({
			minWidth: 0,
			width: "100%",
			maxWidth: "1080px",
		});
	});

	it("Pin in parent → Center keeps the width instead of shrinking to the content", () => {
		expect(
			getBlockSiblingFlexItemStyles({ width: "100%", maxWidth: "1080px", contentAlignHorizontal: "center" }, "column"),
		).toMatchObject({ alignSelf: "center", width: "100%", maxWidth: "1080px" });
	});

	it("a block that centres itself with auto margins keeps centring in its capped slot", () => {
		expect(getBlockSiblingFlexItemStyles({ width: "100%", maxWidth: "1180px", margin: "0 auto" }, "column")).toMatchObject({
			width: "100%",
			maxWidth: "1180px",
			marginLeft: "auto",
			marginRight: "auto",
		});
		expect(
			getBlockSiblingFlexItemStyles({ width: "100%", maxWidth: "1180px", marginLeft: "auto", marginRight: "auto" }, "column"),
		).toMatchObject({ marginLeft: "auto", marginRight: "auto" });
	});

	it("leaves everything else as it was: plain fill, hug, and rows", () => {
		expect(getBlockSiblingFlexItemStyles({ textAlign: "center" }, "column")).toEqual({ minWidth: 0 });
		expect(getBlockSiblingFlexItemStyles({ width: "100%", contentAlignHorizontal: "center" }, "column")).toMatchObject({
			alignSelf: "center",
			width: "auto",
		});
		expect(getBlockSiblingFlexItemStyles({ width: "100%", maxWidth: "400px" }, "row")).toEqual({ minWidth: 0 });
	});
});
