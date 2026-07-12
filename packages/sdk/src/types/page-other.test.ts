import { describe, expect, it } from "vitest";
import {
	buildDefaultPageOther,
	mergePageOtherOnWrite,
} from "../types/page-other.js";

describe("mergePageOtherOnWrite", () => {
	it("always merges defaults on create when other is omitted", () => {
		const result = mergePageOtherOnWrite({ title: "Landing" }, "create");
		expect(result.other?.design?.fontFamily).toBe("system-ui");
		expect(result.other?.icons?.defaultSet).toBe("lucide");
	});

	it("merges partial other with defaults on create", () => {
		const result = mergePageOtherOnWrite(
			{ title: "Landing", other: { design: { fontFamily: "Inter, sans-serif" } } },
			"create",
		);
		expect(result.other?.design).toEqual({
			fontFamily: "Inter, sans-serif",
			containerWidth: "1200px",
			padding: "2rem 1rem",
		});
	});

	it("does not inject other on update when omitted", () => {
		const result = mergePageOtherOnWrite({ title: "Renamed" }, "update");
		expect("other" in result).toBe(false);
	});

	it("merges partial other on update when provided", () => {
		const result = mergePageOtherOnWrite(
			{ other: { seo: { metaTitle: "About" } } },
			"update",
		);
		expect(result.other?.seo?.metaTitle).toBe("About");
		expect(result.other?.design?.containerWidth).toBe("1200px");
	});
});

describe("buildDefaultPageOther", () => {
	it("matches dashboard baseline", () => {
		expect(buildDefaultPageOther()).toEqual({
			design: {
				fontFamily: "system-ui",
				containerWidth: "1200px",
				padding: "2rem 1rem",
			},
			icons: { defaultSet: "lucide", defaultSize: 24 },
			seo: {},
		});
	});
});
