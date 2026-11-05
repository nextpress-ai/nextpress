import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createNextpress } from "@nextpress-org/sdk";
import { DOCS_GUIDE, DOCS_GUIDE_URI } from "./docs/docs-guide.js";
import { BLOCK_NAMES } from "../../../shared/block-catalog/block-names.js";
import { writeDocsPrompt } from "./prompts/write-docs-prompt.js";
import { SITE_ID } from "./test/fake-nextpress-api.js";
import { connectMcpSession, resourceText, textPayload, type LinkedSession } from "./test/mcp-session.js";

/** The block names the guide may list: the real ones in the block catalog. */
const guideBlockNames = (): string[] => [...new Set([...DOCS_GUIDE.matchAll(/\b(?:core|docs)\/[a-z-]+\b/g)].map((match) => match[0]))];

/** Every tool name the guide and the prompt mention, by its verb-first snake_case shape. */
const namesMentioned = (text: string): string[] =>
	[...text.matchAll(/\b(?:list|get|create|update|add|reorder|delete|read|write|publish|upload|patch|build|validate)_[a-z_]+\b/g)].map((match) => match[0]);

describe("the docs guide", () => {
	let session: LinkedSession | undefined;

	beforeEach(async () => {
		session = await connectMcpSession(
			createNextpress({ baseUrl: "https://cms.example.com", apiKey: "npk_live_test", siteId: SITE_ID, fetch: vi.fn() as typeof fetch }),
		);
	});

	afterEach(async () => {
		await session?.close();
		session = undefined;
	});

	describe("the guide", () => {
		it("never lists a block that does not exist", () => {
			const known = new Set<string>(BLOCK_NAMES);
			const mentioned = guideBlockNames();

			expect(mentioned.length).toBeGreaterThan(15);
			for (const name of mentioned) expect(known.has(name), name).toBe(true);
		});

		it("names the core blocks and docs components a docs page is written with", () => {
			for (const name of [
				"core/heading",
				"core/paragraph",
				"core/list",
				"core/quote",
				"core/code",
				"core/image",
				"core/table",
				"core/button",
				"docs/callout",
				"docs/code-group",
				"core/steps",
				"core/tabs",
				"core/card",
				"core/accordion",
				"docs/file-tree",
				"docs/params",
				"docs/example",
				"docs/diagram",
				"docs/update",
			]) {
				expect(DOCS_GUIDE, name).toContain(name);
			}
		});

		it("no longer teaches MDX", () => {
			expect(DOCS_GUIDE).not.toMatch(/mdx/i);
			expect(writeDocsPrompt({ topic: "x" })).not.toMatch(/mdx/i);
		});

		it("names only tools that exist", async () => {
			const { tools } = await session!.client.listTools();
			const toolNames = new Set(tools.map((tool) => tool.name));
			const mentioned = namesMentioned(`${DOCS_GUIDE}\n${writeDocsPrompt({ topic: "x" })}`);

			expect(mentioned.length).toBeGreaterThan(5);
			for (const name of mentioned) expect(toolNames.has(name), name).toBe(true);
		});
	});

	describe("the same text, whichever way an agent asks", () => {
		it("lists the write_docs prompt with topic required and audience optional", async () => {
			const { prompts } = await session!.client.listPrompts();
			const prompt = prompts.find((candidate) => candidate.name === "write_docs");

			expect(prompt?.arguments?.map((arg) => [arg.name, arg.required])).toEqual([
				["topic", true],
				["audience", false],
			]);
		});

		it("gives the prompt its topic, its audience, the workflow, and the guide itself", async () => {
			const prompt = await session!.client.getPrompt({
				name: "write_docs",
				arguments: { topic: "Installing NextPress", audience: "site owners new to CMSs" },
			});

			const text = prompt.messages[0]?.content.type === "text" ? prompt.messages[0].content.text : "";
			expect(text).toContain("Topic: Installing NextPress");
			expect(text).toContain("Who reads them: site owners new to CMSs");
			expect(text).toContain(DOCS_GUIDE);
			const steps = ["list_docs", "get_docs_tree", "add_docs_page", "get_page", "patch_page_blocks", "publish_page"];
			const positions = steps.map((step) => text.indexOf(step, text.indexOf("# Workflow")));
			expect(positions.every((position) => position > 0)).toBe(true);
			expect([...positions].sort((a, b) => a - b)).toEqual(positions);
			expect(text).toContain("Leave everything as a draft.");
		});

		it("works when the audience is left out", async () => {
			const prompt = await session!.client.getPrompt({ name: "write_docs", arguments: { topic: "Pages" } });

			const text = prompt.messages[0]?.content.type === "text" ? prompt.messages[0].content.text : "";
			expect(text).toContain("Topic: Pages");
			expect(text).not.toContain("Who reads them:");
		});

		it("serves the guide as markdown at nextpress://docs/guide, with the same text", async () => {
			const resource = await session!.client.readResource({ uri: DOCS_GUIDE_URI });

			expect(resource.contents[0]?.mimeType).toBe("text/markdown");
			expect(resourceText(resource)).toBe(DOCS_GUIDE);
		});

		it("gives the get_docs_guide tool the same text", async () => {
			const result = await session!.client.callTool({ name: "get_docs_guide", arguments: {} });

			expect(result.isError).toBeFalsy();
			expect(textPayload(result as { content: Array<{ type: string; text?: string }> })).toBe(DOCS_GUIDE);
		});
	});
});
