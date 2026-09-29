import { describe, expect, it } from "vitest";
import type { BlockConfig } from "@shared/schema-types";
import { renderBlocksToHtml } from "../../renderer/to-html";

const button = (content: Record<string, unknown>): BlockConfig => ({
	id: "btn-1",
	name: "core/button",
	type: "block",
	parentId: null,
	content: { kind: "text", value: "Get updates", url: "#", ...content } as BlockConfig["content"],
});

const send = { iconSet: "lucide", iconName: "Send" };

describe("button icon size on published pages", () => {
	it("uses the chosen size", () => {
		const html = renderBlocksToHtml([button({ icon: send, iconSize: "22px" })]);
		expect(html).toMatch(/<svg[^>]*width="22px"/);
	});

	it("keeps 16px for buttons saved before the setting existed", () => {
		const html = renderBlocksToHtml([button({ icon: send })]);
		expect(html).toMatch(/<svg[^>]*width="16"/);
	});
});
