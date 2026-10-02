import { describe, expect, it } from "vitest";
import { packExternalFonts } from "../lib/page-transfer/pack-external-fonts";

const WOFF = Buffer.from("woff2-bytes");

describe("packExternalFonts", () => {
	it("stores the font file and rewrites the stylesheet import onto that copy", async () => {
		const cssUrl = "https://fonts.googleapis.com/css2?family=Inter";
		const fileUrl = "https://fonts.gstatic.com/s/inter/v1/abc.woff2";
		const packed = await packExternalFonts({
			value: { customCss: `@import url('${cssUrl}');` },
			uploadLimit: 1024 * 1024,
			readRemote: async (url) => {
				if (url === cssUrl) {
					return { bytes: Buffer.from(`src:url(${fileUrl}) format('woff2');`), contentType: "text/css" };
				}
				if (url === fileUrl) return { bytes: WOFF, contentType: "font/woff2" };
				return null;
			},
		});

		expect(packed.files).toHaveLength(1);
		expect(packed.files[0]?.mimeType).toBe("font/woff2");
		expect(packed.files[0]?.data).toBe(WOFF.toString("base64"));
		const css = (packed.value as { customCss: string }).customCss;
		expect(css).toContain(packed.files[0]?.ref);
		expect(css).not.toContain("fonts.googleapis.com");
		expect(css).not.toContain("fonts.gstatic.com");
	});
});
