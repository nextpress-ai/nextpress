import { describe, expect, it } from "vitest";
import type { BlockConfig } from "@shared/schema-types";
import { buildPublishedPageHtml } from "../routes/shared/build-published-page-html";

type PublishedPage = Parameters<typeof buildPublishedPageHtml>[0]["page"];

const group = (children: BlockConfig[]): BlockConfig => ({
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
});

const render = (children: BlockConfig[]): string =>
	buildPublishedPageHtml({
		page: { id: "p", title: "Popup page", blocks: [group(children)], other: { seo: {} } } as PublishedPage,
		canonicalUrl: "http://localhost:5000/page/popup",
	});

describe("published pages with popups", () => {
	it("loads the popup script and the popup CSS when a nested popup is on the page", () => {
		const html = render([
			{
				id: "pop-1",
				name: "core/popup",
				type: "container",
				parentId: "group-1",
				label: "Popup",
				category: "layout",
				content: { kind: "structured", data: { name: "Get updates", slug: "get-updates" } },
				styles: {},
				settings: {},
				children: [],
			},
		]);
		expect(html).toContain('<script src="/vendor/popup.js"></script>');
		expect(html).toContain("dialog.np-popup.block-pop-1::backdrop");
		expect(html).toContain('data-np-popup="get-updates"');
	});

	it("leaves the script out on pages without popups", () => {
		expect(render([])).not.toContain("/vendor/popup.js");
	});
});
