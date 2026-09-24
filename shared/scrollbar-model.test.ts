import { describe, expect, it } from "vitest";
import { buildScrollbarCss, readScrollbarSettings, type ScrollbarSettings } from "./scrollbar-model";
import { safeCssColor, safePxLength } from "./css-safe";
import { readPageDesign, readPageShellContent } from "./page-shell-model";
import type { BlockConfig } from "./schema-types";

const color = (style: string) => ({ property: "backgroundColor", value: "", variant: null, alias: "bg", style });

describe("safe CSS values", () => {
	it("accepts real colours and theme variables", () => {
		expect(safeCssColor("#3b82f6")).toBe("#3b82f6");
		expect(safeCssColor(" rgb(1 2 3 / 50%) ")).toBe("rgb(1 2 3 / 50%)");
		expect(safeCssColor("var(--npb-accent, #007cba)")).toBe("var(--npb-accent, #007cba)");
	});

	it("refuses anything that could close a rule or tag", () => {
		for (const bad of [
			"red;} body{display:none",
			"rgb(0;}body{display:none})",
			"#fff</style><script>",
			"var(--evil)",
			"url(https://x.test/a.png)",
			"",
		]) {
			expect(safeCssColor(bad), bad).toBeUndefined();
		}
		expect(safePxLength("10px")).toBe("10px");
		expect(safePxLength("10px;}")).toBeUndefined();
		expect(safePxLength("50%")).toBeUndefined();
	});
});

describe("scrollbar settings", () => {
	it("standard is a little smaller than a normal bar and has square corners", () => {
		const css = buildScrollbarCss({
			selector: "html",
			settings: { look: "default", width: "14px", thumbColor: color("#111111") },
		});
		expect(css).toContain("html::-webkit-scrollbar{width:12px;height:12px}");
		expect(css).toContain("border-radius:0");
		expect(css).not.toContain("scrollbar-width:thin");
		expect(css).not.toContain("#111111");
		expect(buildScrollbarCss({ selector: "html", settings: undefined })).toBe(css);
		expect(readScrollbarSettings({ look: "default", width: "14px", thumbColor: color("#111111") })).toEqual({
			look: "default",
		});
		expect(readScrollbarSettings({ look: "wobbly" })).toBeUndefined();
	});

	it("custom styles the bar in one branch and the standard properties in the other, never both", () => {
		const settings: ScrollbarSettings = {
			look: "custom",
			width: "12px",
			thumbColor: color("#111111"),
			trackColor: color("#eeeeee"),
			hoverColor: color("#333333"),
		};
		const css = buildScrollbarCss({ selector: "html", settings });
		const [webkit, standard] = css.split("@supports not selector(::-webkit-scrollbar)");
		expect(webkit).toContain("@supports selector(::-webkit-scrollbar)");
		expect(webkit).toContain("html::-webkit-scrollbar{width:12px;height:12px}");
		expect(webkit).toContain("html::-webkit-scrollbar-thumb{background:#111111;border-radius:999px}");
		expect(webkit).toContain("html::-webkit-scrollbar-thumb:hover{background:#333333}");
		expect(webkit).toContain("html::-webkit-scrollbar-track{background:#eeeeee}");
		expect(webkit).not.toContain("scrollbar-color");
		expect(standard).toContain("html{scrollbar-color:#111111 #eeeeee;scrollbar-width:auto}");
		expect(standard).not.toContain("::-webkit-scrollbar");
	});

	it("thin widths map to the standard thin keyword and square corners drop the radius", () => {
		const css = buildScrollbarCss({ selector: ".x", settings: { look: "custom", width: "6px", rounded: false } });
		expect(css).toContain("scrollbar-width:thin");
		expect(css).toContain("border-radius:0");
	});

	it("hover follows a chosen thumb colour, otherwise darkens the default", () => {
		const plain = buildScrollbarCss({ selector: "html", settings: { look: "custom" } });
		expect(plain).toContain("thumb:hover{background:#64748b}");
		const picked = buildScrollbarCss({ selector: "html", settings: { look: "custom", thumbColor: color("#123456") } });
		expect(picked).toContain("thumb:hover{background:#123456}");
	});

	it("hidden turns the bar off in both engines", () => {
		const css = buildScrollbarCss({ selector: "html", settings: { look: "hidden" } });
		expect(css).toContain("html::-webkit-scrollbar{display:none}");
		expect(css).toContain("html{scrollbar-width:none}");
	});

	it("a saved unsafe colour or size falls back instead of reaching the CSS", () => {
		const css = buildScrollbarCss({
			selector: "html",
			settings: readScrollbarSettings({
				look: "custom",
				width: "10px;}body{display:none",
				thumbColor: color("red;}body{display:none"),
			}),
		});
		expect(css).not.toContain("display:none");
		expect(css).toContain("width:10px");
		expect(css).toContain("background:#94a3b8");
	});
});

describe("scrollbar on the page shell", () => {
	it("survives the shell → page design path", () => {
		const shell = {
			id: "shell",
			name: "core/page-shell",
			type: "container",
			parentId: null,
			content: { kind: "structured", data: { scrollbar: { look: "hidden" } } },
			styles: {},
			settings: {},
		} as unknown as BlockConfig;
		expect(readPageShellContent(shell.content).scrollbar).toEqual(expect.objectContaining({ look: "hidden" }));
		expect(readPageDesign({ blocks: [shell] }).scrollbar?.look).toBe("hidden");
	});
});
