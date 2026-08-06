import type { BlockConfig } from "./schema-types.js";

export type ResponsiveHealthIssue = {
	code: string;
	message: string;
	blockId: string;
	severity: "warning" | "error";
};

export type ResponsiveHealthResult = {
	ok: boolean;
	issues: ResponsiveHealthIssue[];
};

const parsePxWidth = (value: unknown): number | null => {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value !== "string") return null;
	const match = /^(\d+(?:\.\d+)?)px$/.exec(value.trim());
	return match ? Number.parseFloat(match[1]) : null;
};

const walkBlocks = (blocks: BlockConfig[], visit: (block: BlockConfig) => void): void => {
	for (const block of blocks) {
		visit(block);
		if (block.children?.length) walkBlocks(block.children, visit);
	}
};

/**
 * Validates common responsive overflow patterns without blocking save.
 * Mirrors validateBlockTree — surfaces issues for editor hints and SDK agents.
 */
export function validateBlockResponsiveHealth(blocks: BlockConfig[]): ResponsiveHealthResult {
	const issues: ResponsiveHealthIssue[] = [];

	walkBlocks(blocks, (block) => {
		const styles = block.styles ?? {};

		if (block.name === "core/image" || block.name === "post/featured-image") {
			const px = parsePxWidth(styles.width);
			if (px && px > 400 && !styles.maxWidth) {
				issues.push({
					code: "IMAGE_FIXED_WIDTH",
					message: "Image uses a fixed width that may overflow on mobile.",
					blockId: block.id,
					severity: "warning",
				});
			}
		}

		if (block.name === "core/container" || block.name === "core/group") {
			if (styles.maxWidth && !styles.width) {
				issues.push({
					code: "CONTAINER_MISSING_WIDTH",
					message: "Container has max-width but no width: 100%; may not shrink on mobile.",
					blockId: block.id,
					severity: "warning",
				});
			}
		}

		if (block.name === "core/table") {
			issues.push({
				code: "TABLE_CHECK_OVERFLOW",
				message: "Wide tables scroll horizontally on mobile — verify content fits.",
				blockId: block.id,
				severity: "warning",
			});
		}
	});

	return { ok: issues.length === 0, issues };
}
