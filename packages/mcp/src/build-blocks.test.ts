import { describe, expect, it } from "vitest";
import { createNextpress } from "@nextpress-org/sdk";
import { buildBlocksFromNodes } from "./build-blocks.js";

describe("buildBlocksFromNodes", () => {
	const builder = createNextpress({
		baseUrl: "http://localhost:3000",
		apiKey: "npk_live_test",
		siteId: "11111111-1111-1111-1111-111111111111",
	}).blocks;

	it("builds nested trees via SDK fromName", () => {
		const blocks = buildBlocksFromNodes({
			builder,
			blocks: [
				{
					name: "core/container",
					children: [
						{ name: "core/heading", text: "Hi", level: 1 },
						{ name: "core/paragraph", text: "Body" },
					],
				},
			],
		});

		expect(blocks).toHaveLength(1);
		expect(blocks[0].name).toBe("core/container");
		expect(blocks[0].children).toHaveLength(2);
		expect(blocks[0].children?.[0]?.name).toBe("core/heading");
		expect(blocks[0].children?.[1]?.name).toBe("core/paragraph");
	});

	it("rejects unknown block names", () => {
		expect(() =>
			buildBlocksFromNodes({
				builder,
				blocks: [{ name: "core/nope" }],
			}),
		).toThrow(/Unknown block name/);
	});
});
