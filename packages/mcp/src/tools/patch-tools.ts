import { z } from "zod";
import {
	buildBlockSchemaCatalog,
	createBlockId,
	validateBlockTree,
	type BlockConfig,
	type BlockPatchOp,
	type NextpressClient,
} from "@nextpress-org/sdk";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatJson, formatSdkResult, runTool } from "../format-result.js";
import type { ToolDeps } from "./tool-deps.js";

const blockConfigSchema: z.ZodType<Record<string, unknown>> = z.lazy(() =>
	z
		.object({
			id: z.string().min(1).optional(),
			name: z.string().min(1),
			type: z.enum(["block", "container"]).optional(),
			parentId: z.string().nullable().optional(),
			label: z.string().optional(),
			content: z.unknown().optional(),
			styles: z.record(z.union([z.string(), z.number(), z.null()])).optional(),
			children: z.array(blockConfigSchema).optional(),
			settings: z.record(z.unknown()).optional(),
		})
		.passthrough(),
);

const patchOpSchema = z.discriminatedUnion("op", [
	z.object({
		op: z.literal("insert"),
		parentId: z.string().nullable(),
		index: z.number().int().optional(),
		block: blockConfigSchema,
	}),
	z.object({
		op: z.literal("update"),
		id: z.string().min(1),
		set: z
			.object({
				label: z.string().optional(),
				content: z.unknown().optional(),
				styles: z.record(z.union([z.string(), z.number(), z.null()])).optional(),
				settings: z.record(z.unknown()).optional(),
				customCss: z.string().optional(),
				other: z.record(z.unknown()).optional(),
			})
			.passthrough(),
	}),
	z.object({
		op: z.literal("delete"),
		id: z.string().min(1),
	}),
	z.object({
		op: z.literal("move"),
		id: z.string().min(1),
		parentId: z.string().nullable(),
		index: z.number().int().optional(),
	}),
]);

/**
 * Semantic block tools: validate, schema catalog, path-based page/post patches.
 */
export function registerPatchTools({ server, client }: ToolDeps): void {
	server.registerTool(
		"validate_blocks",
		{
			title: "Validate blocks",
			description:
				"Dry-run validate a BlockConfig[] against the NextPress registry (unknown names, structure).",
			inputSchema: {
				blocks: z.array(blockConfigSchema).min(1),
			},
		},
		async ({ blocks }) =>
			runTool(async () => {
				const normalized = blocks.map((block) =>
					normalizeIncomingBlock(block, client),
				);
				return formatJson(validateBlockTree(normalized));
			}),
	);

	server.registerTool(
		"patch_page_blocks",
		{
			title: "Patch page blocks",
			description:
				"Apply insert/update/move/delete ops to a page block tree. Requires expectedVersion from get_page. Prefer this over full update_page for edits.",
			inputSchema: {
				id: z.string().min(1),
				expectedVersion: z.number().int().min(0),
				ops: z.array(patchOpSchema).min(1),
			},
		},
		async ({ id, expectedVersion, ops }) =>
			runTool(async () => {
				const prepared = ops.map((op) => prepareOp(op, client));
				const result = await client.pages.patchBlocks({
					id,
					expectedVersion,
					ops: prepared,
				});
				if (result.isOk) {
					return formatJson({
						page: result.value.entity,
						summary: result.value.summary,
					});
				}
				return formatSdkResult(result);
			}),
	);

	server.registerTool(
		"patch_post_blocks",
		{
			title: "Patch post blocks",
			description:
				"Apply insert/update/move/delete ops to a post block tree. Requires expectedVersion from get_post.",
			inputSchema: {
				id: z.string().min(1),
				expectedVersion: z.number().int().min(0),
				ops: z.array(patchOpSchema).min(1),
			},
		},
		async ({ id, expectedVersion, ops }) =>
			runTool(async () => {
				const prepared = ops.map((op) => prepareOp(op, client));
				const result = await client.posts.patchBlocks({
					id,
					expectedVersion,
					ops: prepared,
				});
				if (result.isOk) {
					return formatJson({
						post: result.value.entity,
						summary: result.value.summary,
					});
				}
				return formatSdkResult(result);
			}),
	);
}

/** Register nextpress://blocks/schema resource. */
export function registerBlockSchemaResource({ server }: { server: McpServer }): void {
	server.registerResource(
		"blocks-schema",
		"nextpress://blocks/schema",
		{
			title: "Block schema catalog",
			description: "Registry metadata for valid block names, types, and child rules",
			mimeType: "application/json",
		},
		async (uri) => ({
			contents: [
				{
					uri: uri.href,
					mimeType: "application/json",
					text: JSON.stringify(buildBlockSchemaCatalog(), null, 2),
				},
			],
		}),
	);
}

function prepareOp(
	op: z.infer<typeof patchOpSchema>,
	client: NextpressClient,
): BlockPatchOp {
	if (op.op === "insert") {
		return {
			op: "insert",
			parentId: op.parentId,
			index: op.index,
			block: normalizeIncomingBlock(op.block, client),
		};
	}
	if (op.op === "update") {
		return {
			op: "update",
			id: op.id,
			set: op.set as Extract<BlockPatchOp, { op: "update" }>["set"],
		};
	}
	if (op.op === "delete") {
		return { op: "delete", id: op.id };
	}
	return {
		op: "move",
		id: op.id,
		parentId: op.parentId,
		index: op.index,
	};
}

function normalizeIncomingBlock(
	raw: Record<string, unknown>,
	client: NextpressClient,
): BlockConfig {
	const name = String(raw.name ?? "");
	const childrenRaw = Array.isArray(raw.children) ? raw.children : undefined;
	const children = childrenRaw?.map((child) =>
		normalizeIncomingBlock(child as Record<string, unknown>, client),
	);

	if (client.blocks.isBlockName(name) && raw.content && raw.type && raw.id) {
		return {
			id: String(raw.id),
			name,
			type: raw.type as BlockConfig["type"],
			parentId: (raw.parentId as string | null | undefined) ?? null,
			label: raw.label as string | undefined,
			content: raw.content as BlockConfig["content"],
			styles: raw.styles as BlockConfig["styles"],
			settings: raw.settings as BlockConfig["settings"],
			children,
		};
	}

	if (client.blocks.isBlockName(name)) {
		return client.blocks.fromName(name, {
			id: typeof raw.id === "string" ? raw.id : undefined,
			label: typeof raw.label === "string" ? raw.label : undefined,
			children,
		});
	}

	return {
		id: typeof raw.id === "string" ? raw.id : createBlockId(),
		name,
		type: (raw.type as BlockConfig["type"]) ?? "block",
		parentId: (raw.parentId as string | null | undefined) ?? null,
		label: raw.label as string | undefined,
		content: (raw.content as BlockConfig["content"]) ?? { kind: "empty" },
		styles: raw.styles as BlockConfig["styles"],
		children,
		settings: raw.settings as BlockConfig["settings"],
	};
}
