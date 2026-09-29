import { describe, expect, it } from "vitest";
import type { BlockConfig } from "@shared/schema-types";
import { buildPublishedPageHtml } from "../routes/shared/build-published-page-html";

type PublishedPage = Parameters<typeof buildPublishedPageHtml>[0]["page"];

const paragraph = (id: string, other: BlockConfig["other"], extra: Partial<BlockConfig> = {}): BlockConfig => ({
	id,
	name: "core/paragraph",
	type: "block",
	parentId: "group-1",
	label: "Paragraph",
	category: "basic",
	content: { kind: "text", value: `Text ${id}` },
	styles: {},
	settings: {},
	other,
	...extra,
});

const pageWith = (children: BlockConfig[]): PublishedPage =>
	({
		id: "page-motion",
		title: "Motion",
		// Nested inside a group, the way real pages are (the page shell is added around them).
		blocks: [
			{
				id: "group-1",
				name: "core/group",
				type: "container",
				parentId: null,
				label: "Group",
				category: "layout",
				content: { kind: "structured", data: { tagName: "div" } },
				styles: {},
				settings: {},
				children,
			},
		],
		other: { seo: {} },
	}) as PublishedPage;

const render = (children: BlockConfig[]): string =>
	buildPublishedPageHtml({ page: pageWith(children), canonicalUrl: "http://localhost:5000/page/motion" });

describe("published pages carry motion for nested blocks", () => {
	it("adds a nested block's orbit and lift rules to the page head", () => {
		const html = render([
			paragraph("orbit-1", { animation: { loop: { name: "np-orbit", orbitRadius: "160px" }, hover: { name: "np-lift" } } }),
		]);
		expect(html).toContain(".block-orbit-1{animation:np-orbit");
		expect(html).toContain("--np-orbit-radius:160px");
		expect(html).toContain(".block-orbit-1:hover{transform:translateY(-3px)");
		// Nextpress moves need no Animate.css download.
		expect(html).not.toContain("/vendor/animate.min.css");
	});

	it("loads Animate.css and the entry script when a nested block fades in", () => {
		const html = render([paragraph("fade-1", { animation: { entry: { name: "fadeInUp" } } })]);
		expect(html).toContain("/vendor/animate.min.css");
		expect(html).toContain("/vendor/entry-animations.js");
		expect(html).toContain('data-np-entry="fadeInUp"');
	});

	it("never leaves faded blocks hidden when the entry script does not arrive", () => {
		const html = render([paragraph("fade-2", { animation: { entry: { name: "fadeInUp" } } })]);
		// Blocks are hidden only while <html> waits for the script…
		expect(html).toContain(".np-entry-wait [data-np-entry]:not(.np-entry-played){opacity:0;}");
		expect(html).not.toMatch(/[^ ]\[data-np-entry\]:not\(\.np-entry-played\)\{opacity:0;\}/);
		// …and the wait ends on its own if the script never starts.
		expect(html).toContain('classList.add(c);setTimeout(function(){if(!window.npEntryReady)');
		expect(html).toContain("window.initEntryAnimations && window.initEntryAnimations();");
	});

	it("keeps a nested block's custom CSS", () => {
		const html = render([paragraph("styled-1", { css: ".block-styled-1{letter-spacing:2px}" })]);
		expect(html).toContain(".block-styled-1{letter-spacing:2px}");
	});

	it("adds a drifting background for a nested block", () => {
		const html = render([
			paragraph("drift-1", {
				fills: {
					background: {
						kind: "gradient",
						shape: "radial",
						angle: 0,
						stops: [
							{ color: "#000000", position: 0 },
							{ color: "#334155", position: 100 },
						],
						motion: { kind: "drift", seconds: 40 },
					},
				},
			}),
		]);
		expect(html).toContain(".block-drift-1::before{");
		expect(html).toContain("np-fill-drift 40s linear infinite");
	});
});
