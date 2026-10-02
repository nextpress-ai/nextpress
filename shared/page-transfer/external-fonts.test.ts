import { describe, expect, it } from "vitest";
import { findExternalFontUrls, findFontFileUrls, rewriteExternalFontText } from "./external-fonts";

describe("external font addresses", () => {
	it("finds a Google stylesheet and the font files it names", () => {
		const css = "@import url('https://fonts.googleapis.com/css2?family=Inter&display=swap');";
		const sheet = "src:url(https://fonts.gstatic.com/s/inter/v1/abc.woff2) format('woff2');";
		expect(findExternalFontUrls({ customCss: css })).toEqual([
			{ url: "https://fonts.googleapis.com/css2?family=Inter&display=swap", kind: "stylesheet" },
		]);
		expect(findFontFileUrls(sheet)).toEqual(["https://fonts.gstatic.com/s/inter/v1/abc.woff2"]);
	});

	it("replaces the import with the downloaded rules and the file address with the local copy", () => {
		const text = "@import url('https://fonts.googleapis.com/css2?family=Inter'); .block-a{font-family:Inter}";
		const next = rewriteExternalFontText({
			text,
			stylesheets: new Map([
				[
					"https://fonts.googleapis.com/css2?family=Inter",
					"@font-face{src:url(/uploads/np-font-abc.woff2)}",
				],
			]),
			files: new Map(),
		});
		expect(next).toContain("@font-face{src:url(/uploads/np-font-abc.woff2)}");
		expect(next).not.toContain("fonts.googleapis.com");
		expect(next).toContain(".block-a{font-family:Inter}");
	});
});
