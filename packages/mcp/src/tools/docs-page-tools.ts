import { MAX_DOCS_REORDER_ITEMS } from "@nextpress-org/sdk";
import { z } from "zod";
import { docsText, runDocsTool, valueOrThrow } from "../docs/docs-reply.js";
import type { ToolDeps } from "./tool-deps.js";

const homeIdSchema = z.string().uuid().describe("The docs' id, from list_docs");
const pageIdSchema = z.string().uuid().describe("The page's or group's id, from get_docs_tree");
const parentIdSchema = z
	.string()
	.uuid()
	.optional()
	.describe("The page or group it sits under, from get_docs_tree. Leave out for the top of the docs.");

/** The pages and groups of a docs: add, change, order and delete them. The server checks each one against its docs. */
export function registerDocsPageTools({ server, client }: ToolDeps): void {
	server.registerTool(
		"add_docs_page",
		{
			title: "Add docs page",
			description:
				"Adds a page or a group to a docs. A page holds content; a group is a heading in the sidebar that holds other pages and has no content of its own. Put it under a page or group with parentId, or leave parentId out to put it at the top of the docs. A new page is a draft. Its address is made from its title; change it with update_docs_page. A new page starts empty: write its content with the page and block tools (see get_docs_guide).",
			inputSchema: {
				homeId: homeIdSchema,
				parentId: parentIdSchema,
				kind: z.enum(["page", "group"]).describe('"page" for a page with content, "group" for a sidebar heading that holds pages'),
				title: z.string().min(1).max(200).describe("The title, shown on the page and in the sidebar"),
				position: z
					.number()
					.int()
					.min(0)
					.optional()
					.describe("Where it goes among its siblings: 0 is first. Default: last."),
			},
		},
		async ({ homeId, parentId, kind, title, position }) =>
			runDocsTool({
				toolName: "add_docs_page",
				ids: { homeId, parentId },
				run: async () => {
					const { item } = valueOrThrow(
						await client.docs.addItem({ homeId, parentId: parentId ?? homeId, kind, title, position }),
					);
					const next =
						item.kind === "page"
							? "It is a draft and empty. Write its content with get_page and patch_page_blocks (see get_docs_guide)."
							: "Add pages inside it with parentId set to its id.";
					return docsText(`Added the ${item.kind} "${item.title}" at ${item.path}. Its id is ${item.id}. ${next}`);
				},
			}),
	);

	server.registerTool(
		"update_docs_page",
		{
			title: "Update docs page",
			description:
				"Changes one docs page or group: its title, its address (the last part of its web address), the page or group it sits under, whether it is hidden from the sidebar, and whether it is a page or a group. Only the fields you send change. Changing an address breaks the links that point at the old one, so check them with get_docs_tree. The docs home stays at the top of the sidebar: it cannot be hidden, made a group or moved.",
			inputSchema: {
				pageId: pageIdSchema,
				title: z.string().min(1).max(200).optional().describe("The new title"),
				address: z
					.string()
					.min(1)
					.max(200)
					.optional()
					.describe("The new last part of the address, using letters, numbers and dashes, such as install"),
				move_under: z
					.string()
					.uuid()
					.optional()
					.describe("Move it under this page or group, at its end. Use an id from get_docs_tree."),
				hide: z
					.boolean()
					.optional()
					.describe("true hides it from the sidebar; false shows it again. It still opens at its address."),
				kind: z.enum(["page", "group"]).optional().describe("Whether it is a page or a group"),
			},
		},
		async ({ pageId, title, address, move_under, hide, kind }) =>
			runDocsTool({
				toolName: "update_docs_page",
				ids: { pageId, parentId: move_under },
				run: async () => {
					const { item } = valueOrThrow(
						await client.docs.updateItem({ pageId, title, slug: address, parentId: move_under, hidden: hide, kind }),
					);
					const sidebar = item.hidden ? "It is hidden from the sidebar." : "It shows in the sidebar.";
					const links =
						address !== undefined ? " Links to the old address will not work until they are changed." : "";
					return docsText(`Updated the ${item.kind} "${item.title}". Its address is ${item.path}. ${sidebar}${links}`);
				},
			}),
	);

	server.registerTool(
		"reorder_docs_pages",
		{
			title: "Reorder docs pages",
			description:
				"Sets the order of the pages under one page or group, or at the top of the docs when parentId is left out. Send every page under that parent, each id once, in the new order (get the ids from get_docs_tree). If the list does not match the pages exactly, nothing moves and the reply says to read the tree again.",
			inputSchema: {
				homeId: homeIdSchema,
				parentId: parentIdSchema,
				orderedIds: z
					.array(z.string().uuid())
					.max(MAX_DOCS_REORDER_ITEMS)
					.describe("Every page under the parent, in the new order"),
			},
		},
		async ({ homeId, parentId, orderedIds }) =>
			runDocsTool({
				toolName: "reorder_docs_pages",
				ids: { homeId, parentId },
				run: async () => {
					valueOrThrow(await client.docs.reorder({ homeId, parentId: parentId ?? homeId, orderedIds }));
					const where = parentId ? "under that page or group" : "at the top of the docs";
					return docsText(`Set the new order of the ${orderedIds.length} pages ${where}.`);
				},
			}),
	);

	server.registerTool(
		"delete_docs_page",
		{
			title: "Delete docs page",
			description:
				"Deletes one docs page or group. A page or group that still has pages under it cannot be deleted: move or delete those first, and the reply says so. Ask the owner first unless they asked for this deletion.",
			inputSchema: { pageId: pageIdSchema },
			annotations: { destructiveHint: true },
		},
		async ({ pageId }) =>
			runDocsTool({
				toolName: "delete_docs_page",
				ids: { pageId },
				run: async () => {
					valueOrThrow(await client.docs.deleteItem({ pageId }));
					return docsText("Deleted it. The sidebar no longer lists it.");
				},
			}),
	);
}
