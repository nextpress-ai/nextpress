import { z } from "zod";
import { DOCS_GUIDE } from "../docs/docs-guide.js";
import { docsText, runDocsTool, valueOrThrow } from "../docs/docs-reply.js";
import { viewDocsSummary, viewItem } from "../docs/docs-view.js";
import { formatJson } from "../format-result.js";
import type { ToolDeps } from "./tool-deps.js";

const homeIdSchema = z.string().uuid().describe("The docs' id, from list_docs");

const linkSchema = z.object({
	label: z.string().max(80).describe("The words on the link"),
	url: z.string().max(2048).describe("Where it goes: a docs address such as /docs/install, or an https link"),
});

const featuresSchema = z
	.object({
		sidebar: z.boolean().optional().describe("The sidebar of pages"),
		toc: z.boolean().optional().describe('The "On this page" list'),
		prevNext: z.boolean().optional().describe("The previous and next links at the foot of a page"),
		copyPage: z.boolean().optional().describe('The "Copy page" button'),
	})
	.describe("Which parts of the docs frame show. Only the switches you name change.");

/** The docs as a whole: list and make docs, read their navigation, change their header, and the guide. */
export function registerDocsTools({ server, client }: ToolDeps): void {
	server.registerTool(
		"list_docs",
		{
			title: "List docs",
			description:
				"Lists this site's docs: each one's id (homeId), name, address, number of pages, whether search is on, and its status. A docs is a set of pages with its own header, sidebar and search. Use the id as homeId in the other docs tools. If the list is empty, make one with create_docs.",
			inputSchema: {},
			annotations: { readOnlyHint: true },
		},
		async () =>
			runDocsTool({
				toolName: "list_docs",
				ids: {},
				run: async () => {
					const { docs } = await client.docs.list();
					return formatJson({
						docs: docs.map(viewDocsSummary),
						...(docs.length === 0 ? { hint: "This site has no docs yet. Make one with create_docs." } : {}),
					});
				},
			}),
	);

	server.registerTool(
		"create_docs",
		{
			title: "Create docs",
			description:
				"Makes a docs on this site. Its home page is created first, empty and as a draft, and it is the top of the sidebar. Give the docs a name. Its address is made from the name unless you pass slug, the first part of the address: docs gives /docs. Returns the docs' id (homeId) for the other docs tools. Check list_docs first, so you do not make a second copy.",
			inputSchema: {
				name: z.string().min(1).max(200).describe('The docs\' name, shown in the header, such as "Acme Docs"'),
				slug: z.string().max(200).optional().describe("The first part of the address, without a slash, such as docs"),
				search: z.boolean().optional().describe("Show the search button (default: on)"),
				features: featuresSchema.optional(),
			},
		},
		async ({ name, slug, search, features }) =>
			runDocsTool({
				toolName: "create_docs",
				ids: { slug },
				run: async () => {
					const created = valueOrThrow(await client.docs.create({ name, slug, search, features }));
					return docsText(
						`Made the docs "${created.docs.name}" at ${created.docs.path}. Its id is ${created.homeId}: pass it as homeId to the other docs tools. The home page is the first page; add more with add_docs_page.`,
					);
				},
			}),
	);

	server.registerTool(
		"get_docs_tree",
		{
			title: "Get docs tree",
			description:
				"Reads one docs' navigation: every page and group in sidebar order, each with its id, title, address, kind (page or group), whether it is hidden from the sidebar, its status, and the pages under it. Also returns the docs' header settings. Read it before you add, move or link pages, so you use ids and addresses that exist.",
			inputSchema: { homeId: homeIdSchema },
			annotations: { readOnlyHint: true },
		},
		async ({ homeId }) =>
			runDocsTool({
				toolName: "get_docs_tree",
				ids: { homeId },
				run: async () => {
					const tree = await client.docs.tree({ homeId });
					return formatJson({ home: viewItem(tree.home), settings: tree.settings });
				},
			}),
	);

	server.registerTool(
		"update_docs_settings",
		{
			title: "Update docs settings",
			description:
				"Changes one docs' header and frame: its name, logos, header links (up to six, in order), the button in the header, the search button, and the frame switches. Only the fields you send change. A list you send (links) replaces the old list, so send all of it. The reply gives the settings after the change.",
			inputSchema: {
				homeId: homeIdSchema,
				title: z.string().min(1).max(200).optional().describe("The name shown in the header"),
				logoUrl: z.string().max(2048).optional().describe("The logo for light pages, as a picture url"),
				logoDarkUrl: z.string().max(2048).optional().describe("The logo for dark pages. Leave out to use the light logo."),
				links: z.array(linkSchema).max(6).optional().describe("The header links, in order"),
				button: linkSchema.optional().describe('The button in the header, such as "Get started". An empty label removes it.'),
				search: z
					.object({
						show: z.boolean().optional(),
						label: z.string().max(80).optional(),
						placeholder: z.string().max(120).optional(),
					})
					.optional()
					.describe("The search button: whether it shows, its label, and the text in the search box"),
				features: featuresSchema.optional(),
			},
		},
		async ({ homeId, ...settings }) =>
			runDocsTool({
				toolName: "update_docs_settings",
				ids: { homeId },
				run: async () => {
					const saved = valueOrThrow(await client.docs.updateSettings({ homeId, ...settings }));
					return docsText(`Saved the docs settings. Now:\n${JSON.stringify(saved.settings, null, 2)}`);
				},
			}),
	);

	server.registerTool(
		"get_docs_guide",
		{
			title: "Docs writing guide",
			description:
				"A short guide to making a docs in NextPress: create it, add pages and groups, order, move and hide them, and write each page's content with the normal page and block tools using the core and docs blocks. Read it before you build or change a docs. The write_docs prompt and the nextpress://docs/guide resource hold the same text.",
			inputSchema: {},
			annotations: { readOnlyHint: true },
		},
		async () => docsText(DOCS_GUIDE),
	);
}
