import { DOCS_GUIDE } from "../docs/docs-guide.js";

const WRITE_DOCS_WORKFLOW = `# Workflow
1. Find the docs. Call list_docs. If there are none, call create_docs with a name. Keep the docs' homeId.
2. See what exists. Call get_docs_tree with the homeId. Use a page that already covers the topic rather than making a second one. Note the addresses you may link to.
3. Plan. Split the topic into pages: one idea per page, each with a title and a place in the tree. Groups hold pages; pages hold the content.
4. Make each page. Call add_docs_page with the homeId, the parent (a page or group, or leave it out for the top of the docs), kind "page" and the title.
5. Write it. Call get_page for the new page, then fill it with patch_page_blocks, using the blocks the guide below names.
6. Check the links. Every link to a docs page must match an address from get_docs_tree.
7. Leave everything as a draft. Call publish_page only when the owner asks, using the version of the page.
8. Finish with one or two plain sentences: which pages you made, and what the owner should check.`;

/**
 * The prompt text for writing docs: who it is for, the workflow in order, then the guide the agent
 * writes by (the same text the resource and the get_docs_guide tool give).
 */
export function writeDocsPrompt({ topic, audience }: { topic: string; audience?: string }): string {
	const brief = [
		"You are writing docs pages for a NextPress site through this MCP server. The owner reviews the docs in the editor, so every page you make stays a draft.",
		`Topic: ${topic}`,
		audience ? `Who reads them: ${audience}` : "",
	].filter(Boolean);
	return [brief.join("\n"), WRITE_DOCS_WORKFLOW, DOCS_GUIDE].join("\n\n");
}
