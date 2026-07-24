import type { BlockConfig, BlockContent } from "../types/domain.js";
import { BLOCK_DEFINITIONS, isBlockName, type BlockName } from "./block-definitions.js";

export const UNKNOWN_BLOCK = "UNKNOWN_BLOCK" as const;
export const INVALID_BLOCK_TYPE = "INVALID_BLOCK_TYPE" as const;
export const INVALID_BLOCK_STRUCTURE = "INVALID_BLOCK_STRUCTURE" as const;
export const DUPLICATE_BLOCK_ID = "DUPLICATE_BLOCK_ID" as const;

export type BlockValidationIssue = {
	code:
		| typeof UNKNOWN_BLOCK
		| typeof INVALID_BLOCK_TYPE
		| typeof INVALID_BLOCK_STRUCTURE
		| typeof DUPLICATE_BLOCK_ID;
	message: string;
	blockId?: string;
	blockName?: string;
};

export type ValidateBlockTreeResult =
	| { ok: true; blockCount: number }
	| { ok: false; issues: BlockValidationIssue[] };

/**
 * Registry-aware tree validation for agent/SDK writes.
 * Catches unknown names, type mismatches, missing ids, and duplicate ids.
 */
export function validateBlockTree(blocks: BlockConfig[]): ValidateBlockTreeResult {
	const issues: BlockValidationIssue[] = [];
	const seenIds = new Set<string>();
	let blockCount = 0;

	const walk = (nodes: BlockConfig[]): void => {
		for (const block of nodes) {
			blockCount += 1;

			if (!block.id?.trim()) {
				issues.push({
					code: INVALID_BLOCK_STRUCTURE,
					message: "Block is missing a non-empty id",
					blockName: block.name,
				});
			} else if (seenIds.has(block.id)) {
				issues.push({
					code: DUPLICATE_BLOCK_ID,
					message: `Duplicate block id "${block.id}"`,
					blockId: block.id,
					blockName: block.name,
				});
			} else {
				seenIds.add(block.id);
			}

			if (!isBlockName(block.name)) {
				issues.push({
					code: UNKNOWN_BLOCK,
					message: `Unknown block name "${block.name}". Use list_block_types / blocks catalog.`,
					blockId: block.id,
					blockName: block.name,
				});
			} else {
				const def = BLOCK_DEFINITIONS[block.name as BlockName];
				if (block.type !== def.type) {
					issues.push({
						code: INVALID_BLOCK_TYPE,
						message: `Block "${block.name}" must have type "${def.type}" (got "${block.type}")`,
						blockId: block.id,
						blockName: block.name,
					});
				}
				if (def.type === "block" && block.children && block.children.length > 0) {
					issues.push({
						code: INVALID_BLOCK_STRUCTURE,
						message: `Leaf block "${block.name}" cannot have children`,
						blockId: block.id,
						blockName: block.name,
					});
				}
			}

			if (!isValidContentShape(block.content)) {
				issues.push({
					code: INVALID_BLOCK_STRUCTURE,
					message: `Block "${block.id}" has invalid content shape`,
					blockId: block.id,
					blockName: block.name,
				});
			}

			if (block.children?.length) {
				walk(block.children);
			}
		}
	};

	walk(blocks);

	if (issues.length > 0) {
		return { ok: false, issues };
	}
	return { ok: true, blockCount };
}

function isValidContentShape(content: BlockContent): boolean {
	if (content === undefined) return true;
	if (typeof content !== "object" || content === null) return false;
	if (!("kind" in content)) return false;
	const kind = (content as { kind: string }).kind;
	return (
		kind === "text" ||
		kind === "markdown" ||
		kind === "media" ||
		kind === "html" ||
		kind === "structured" ||
		kind === "empty"
	);
}

/** Machine-readable catalog for MCP / agents (schemas are descriptive, not full JSON Schema draft). */
export type BlockSchemaCatalogEntry = {
	name: BlockName;
	label: string;
	type: "block" | "container";
	category: string;
	allowsChildren: boolean;
	defaultContentKind: string;
};

export function buildBlockSchemaCatalog(): {
	version: 1;
	blocks: BlockSchemaCatalogEntry[];
} {
	const blocks = (Object.keys(BLOCK_DEFINITIONS) as BlockName[]).map((name) => {
		const def = BLOCK_DEFINITIONS[name];
		const defaultContent = def.defaultContent();
		const defaultContentKind =
			defaultContent && typeof defaultContent === "object" && "kind" in defaultContent
				? String((defaultContent as { kind: string }).kind)
				: "empty";
		return {
			name: def.name,
			label: def.label,
			type: def.type,
			category: def.category,
			allowsChildren: def.type === "container",
			defaultContentKind,
		};
	});
	return { version: 1, blocks };
}
