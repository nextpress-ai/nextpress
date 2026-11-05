import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PAGE_DESIGN_GUIDE } from "@nextpress-org/sdk";
import { z } from "zod";
import { toMcpText } from "../tools/mcp-tool-text.js";
import { writeDocsPrompt } from "./write-docs-prompt.js";

type PromptResult = {
	description: string;
	messages: Array<{ role: "user"; content: { type: "text"; text: string } }>;
};

const asPrompt = ({ description, text }: { description: string; text: string }): PromptResult => ({
	description,
	messages: [{ role: "user", content: { type: "text", text } }],
});

const BUILD_PAGE_WORKFLOW = `# Workflow
1. Learn the site. Call get_site_context (name, theme colours, settings). Call list_pages (link only to pages that exist), list_media (pictures to use) and list_template_parts (reuse a shared header or footer when the site has one).
2. Get a page to work on. For a new page call create_page with just a title: it starts as a draft. Then call get_page_outline with its id. An empty page gets its page shell automatically with the first block you add at the root.
3. Learn the blocks. Call list_block_types to see the blocks and when to use each. Call get_block_type before you use a block for the first time, to see its fields.
4. Build in small steps. Call change_page_blocks with one section per call (header, hero, features...). To fill a block you are making in the same call, give it a ref and use the ref as parentId in a later op. Each reply lists the new blocks with their ids; use those ids in later calls. If a call is refused, the reply says why: fix it and send the whole call again. If you are told the page changed somewhere else, call get_page_outline again first.
5. Check. Each change_page_blocks reply checks the page. If it lists phone warnings, call apply_page_phone_fixes. You don't need check_page after a change.
6. Preview. Call preview_page with the page's id and give the owner the link.
7. Leave it as a draft. Do not call publish_page unless the owner asks. Say in one or two plain sentences what you built and what the owner still needs to fill in (the [bracketed] placeholders).`;

/** The prompt text for building a page: who it is for, the workflow, then the design guide. */
export function buildPagePrompt({ purpose, audience }: { purpose?: string; audience?: string }): string {
	const brief = [
		"You are building a page on a NextPress site through this MCP server. The owner reviews your work, so work on a draft.",
		purpose ? `What the page is for: ${purpose}` : "",
		audience ? `Who it is for: ${audience}` : "",
	].filter(Boolean);
	return toMcpText([brief.join("\n"), BUILD_PAGE_WORKFLOW, PAGE_DESIGN_GUIDE].join("\n\n"));
}

/** The prompt text for changing one block and nothing else on the page. */
export function editBlockPrompt({
	id,
	blockId,
	request,
}: {
	id: string;
	blockId: string;
	request: string;
}): string {
	return `You are changing one block on a NextPress page, and nothing else.

Page: ${id}
Block: ${blockId}
Request: ${request}

1. Call get_page_outline with id "${id}" and find block ${blockId}. If it is not on the page, say so and stop; do not pick another block.
2. Call get_page_block with id "${id}" and block_id "${blockId}" to read its content and styles.
3. Make the change with change_page_blocks. Touch only block ${blockId} and the blocks inside it: update it, replace it, or add, move or remove blocks inside it. Do not edit, move or delete anything outside it, even if it looks related. If the request cannot be done inside the block, say what would need to change and ask.
4. Read the reply: it checks the page. Do not run apply_page_phone_fixes here: it repairs the whole page. If the reply shows a phone warning for this block, fix it with an update on this block.
5. Reply in one or two plain sentences saying what changed.`;
}

/**
 * Register the MCP prompts: ready-made instructions a client can offer as a starting point.
 * `build_page` carries the design guide so an agent builds a page the way the editor's own
 * assistant does; `edit_block` keeps an agent inside the block the owner pointed at.
 */
export function registerContentPrompts({ server }: { server: McpServer }): void {
	server.registerPrompt(
		"build_page",
		{
			title: "Build a page",
			description:
				"Instructions and the design guide for building a good page: outline, block types, small changes, a check, a preview, and a draft left for the owner.",
			argsSchema: {
				purpose: z.string().optional().describe("What the page is for, e.g. a landing page for a bakery"),
				audience: z.string().optional().describe("Who it is for, e.g. local customers on their phones"),
			},
		},
		({ purpose, audience }) =>
			asPrompt({
				description: "Build a page on this NextPress site",
				text: buildPagePrompt({ purpose, audience }),
			}),
	);

	server.registerPrompt(
		"edit_block",
		{
			title: "Edit one block",
			description: "Change one block on a page and leave the rest of the page as it is.",
			argsSchema: {
				id: z.string().min(1).describe("The page: its UUID or slug"),
				block_id: z.string().min(1).describe("The block to change, from get_page_outline"),
				request: z.string().min(1).describe("What to change, in plain words"),
			},
		},
		({ id, block_id, request }) =>
			asPrompt({
				description: "Change one block on a page",
				text: editBlockPrompt({ id, blockId: block_id, request }),
			}),
	);

	server.registerPrompt(
		"write_docs",
		{
			title: "Write docs",
			description:
				"Instructions and the docs writing guide for writing docs pages: find the docs, plan the pages, write them with the page and block tools, check them, and leave them as drafts for the owner.",
			argsSchema: {
				topic: z.string().min(1).describe("What the docs pages are about, e.g. installing NextPress"),
				audience: z.string().optional().describe("Who reads them, e.g. site owners who have never used a CMS"),
			},
		},
		({ topic, audience }) =>
			asPrompt({
				description: "Write docs pages on this NextPress site",
				text: writeDocsPrompt({ topic, audience }),
			}),
	);
}
