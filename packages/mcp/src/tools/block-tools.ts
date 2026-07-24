import { BLOCK_DEFINITIONS } from "@nextpress-org/sdk";
import { buildBlocksFromNodes, type BlockBuildNode } from "../build-blocks.js";
import { formatJson, runTool } from "../format-result.js";
import { blockBuildNodeSchema, type ToolDeps } from "./tool-deps.js";

/** Local block catalog + SDK block builder. */
export function registerBlockTools({ server, client }: ToolDeps): void {
	server.registerTool(
		"list_block_types",
		{
			title: "List block types",
			description: "Canonical block names and metadata from the SDK registry (no network).",
			inputSchema: {},
		},
		async () =>
			runTool(async () => {
				const items = client.blocks.names.map((name) => {
					const def = BLOCK_DEFINITIONS[name];
					return {
						name: def.name,
						label: def.label,
						type: def.type,
						category: def.category,
					};
				});
				return formatJson({ blocks: items });
			}),
	);

	server.registerTool(
		"build_blocks",
		{
			title: "Build blocks",
			description:
				"Convert structured block nodes into BlockConfig[] via SDK helpers. Pass the result to create_page/update_page blocks.",
			inputSchema: {
				blocks: blockBuildNodeSchema.array().min(1),
			},
		},
		async ({ blocks }) =>
			runTool(async () => {
				const built = buildBlocksFromNodes({
					blocks: blocks as BlockBuildNode[],
					builder: client.blocks,
				});
				return formatJson({ blocks: built });
			}),
	);
}
