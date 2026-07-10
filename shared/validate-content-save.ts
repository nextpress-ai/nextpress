import type { BlockConfig } from "./schema-types.js";
import {
	isContainerHtmlTagName,
	isGroupHtmlTagName,
} from "./block-tag-names.js";
import { mergePageOtherWithDefaults, validatePageOtherForSave } from "./page-other.js";
import type { PageOther } from "./schema-types.js";
import { validateIconReference } from "./validate-icon-reference.js";

export const INVALID_ICON = "INVALID_ICON" as const;
export const INVALID_PAGE_OTHER = "INVALID_PAGE_OTHER" as const;
export const INVALID_BLOCK_TAG = "INVALID_BLOCK_TAG" as const;

export type ContentSaveValidationError = {
	code: typeof INVALID_ICON | typeof INVALID_PAGE_OTHER | typeof INVALID_BLOCK_TAG;
	message: string;
	blockId?: string;
};

export type ContentSaveValidationResult =
	| { ok: true; blocks: BlockConfig[]; other: PageOther }
	| { ok: false; error: ContentSaveValidationError };

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const readStructuredData = (content: BlockConfig["content"]): Record<string, unknown> | null => {
	if (!content || !isRecord(content)) return null;
	if (content.kind === "structured" && isRecord(content.data)) {
		return content.data;
	}
	if (isRecord(content)) return content;
	return null;
};

const collectIconCandidates = (
	block: BlockConfig,
): Array<{ raw: unknown; label: string }> => {
	const candidates: Array<{ raw: unknown; label: string }> = [];
	const data = readStructuredData(block.content);

	if (block.name === "core/icon" && data?.icon) {
		candidates.push({ raw: data.icon, label: "icon block" });
	}

	if (block.name === "core/button") {
		if (data?.icon) candidates.push({ raw: data.icon, label: "button icon" });
		if (isRecord(block.content) && block.content.kind === "text") {
			const textContent = block.content as Record<string, unknown>;
			if (textContent.icon) {
				candidates.push({ raw: textContent.icon, label: "button icon" });
			}
		}
	}

	return candidates;
};

const validateBlockTagName = (block: BlockConfig): ContentSaveValidationError | null => {
	const data = readStructuredData(block.content);
	const tagName = data?.tagName;
	if (tagName === undefined) return null;

	if (block.name === "core/group" && !isGroupHtmlTagName(tagName)) {
		return {
			code: INVALID_BLOCK_TAG,
			message: `Invalid group tagName: ${String(tagName)}`,
			blockId: block.id,
		};
	}
	if (block.name === "core/container" && !isContainerHtmlTagName(tagName)) {
		return {
			code: INVALID_BLOCK_TAG,
			message: `Invalid container tagName: ${String(tagName)}`,
			blockId: block.id,
		};
	}
	return null;
};

const walkBlocks = (
	blocks: BlockConfig[],
	visit: (block: BlockConfig) => ContentSaveValidationError | null,
): ContentSaveValidationError | null => {
	for (const block of blocks) {
		const error = visit(block);
		if (error) return error;
		if (block.children?.length) {
			const childError = walkBlocks(block.children, visit);
			if (childError) return childError;
		}
	}
	return null;
};

/**
 * Validates page/post save payloads: page.other shape, block tag names, icon references.
 */
export const validateContentForSave = (params: {
	blocks?: BlockConfig[] | null;
	other?: unknown;
	contentType?: "page" | "post";
}): ContentSaveValidationResult => {
	const contentType = params.contentType ?? "page";

	let other: PageOther;
	if (contentType === "page") {
		const otherResult = validatePageOtherForSave(params.other);
		if (!otherResult.ok) {
			return {
				ok: false,
				error: { code: INVALID_PAGE_OTHER, message: otherResult.message },
			};
		}
		other = otherResult.value;
	} else {
		other = mergePageOtherWithDefaults();
	}

	const blocks = params.blocks ?? [];

	const tagError = walkBlocks(blocks, validateBlockTagName);
	if (tagError) {
		return { ok: false, error: tagError };
	}

	const iconError = walkBlocks(blocks, (block) => {
		for (const candidate of collectIconCandidates(block)) {
			const result = validateIconReference(candidate.raw);
			if (!result.ok) {
				return {
					code: INVALID_ICON,
					message: `${candidate.label} on block ${block.id}: ${result.message}`,
					blockId: block.id,
				};
			}
		}
		return null;
	});
	if (iconError) {
		return { ok: false, error: iconError };
	}

	return {
		ok: true,
		blocks,
		other,
	};
};
