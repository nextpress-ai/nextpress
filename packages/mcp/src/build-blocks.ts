import {
	isBlockName,
	type BlockConfig,
	type BlocksBuilder,
	type BlockName,
} from "@nextpress-org/sdk";

/**
 * Agent-friendly block node. Prefer `text` / `level` helpers; pass `settings` for full editor tabs.
 */
export type BlockBuildNode = {
	name: string;
	text?: string;
	level?: number;
	url?: string;
	alt?: string;
	label?: string;
	children?: BlockBuildNode[];
	settings?: {
		content?: Record<string, unknown>;
		styles?: Record<string, string>;
		advanced?: Record<string, unknown>;
	};
};

/**
 * Turn structured builder ops into BlockConfig[] via the SDK blocks factory.
 * Keeps agents from inventing invalid trees by going through registry helpers.
 */
export function buildBlocksFromNodes({
	blocks,
	builder,
}: {
	blocks: BlockBuildNode[];
	builder: BlocksBuilder;
}): BlockConfig[] {
	return blocks.map((node) => buildOne({ node, builder }));
}

function buildOne({
	node,
	builder,
}: {
	node: BlockBuildNode;
	builder: BlocksBuilder;
}): BlockConfig {
	if (!isBlockName(node.name)) {
		throw new Error(
			`Unknown block name "${node.name}". Call list_block_types for the catalog.`,
		);
	}

	const name = node.name as BlockName;
	const children =
		node.children && node.children.length > 0
			? node.children.map((child) => buildOne({ node: child, builder }))
			: undefined;

	const contentFromHelpers = buildHelperContent(node);
	const settings = {
		content: {
			...contentFromHelpers,
			...(node.settings?.content ?? {}),
		},
		styles: node.settings?.styles,
		advanced: node.settings?.advanced,
	};

	return builder.fromName(name, {
		label: node.label,
		children,
		settings,
	});
}

function buildHelperContent(node: BlockBuildNode): Record<string, unknown> {
	const content: Record<string, unknown> = {};
	if (node.text !== undefined) content.text = node.text;
	if (node.level !== undefined) content.level = node.level;
	if (node.url !== undefined) content.url = node.url;
	if (node.alt !== undefined) content.alt = node.alt;
	return content;
}
