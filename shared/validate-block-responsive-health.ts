import type { BlockConfig } from "./schema-types.js";

export type ResponsiveHealthIssue = {
	code: string;
	message: string;
	blockId: string;
	severity: "warning" | "error";
	/** One-click change that removes the problem, when there is an obvious one. */
	fix?: { label: string; styles: Record<string, string> };
};

/** Widest a block can be fixed at and still fit a phone screen with some padding. */
const PHONE_SAFE_WIDTH_PX = 480;

const blockName = (block: BlockConfig): string => block.label?.trim() || block.name.replace(/^core\//, "");

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
					message: `"${blockName(block)}" has a max width but isn't set to fill its space, so it may not shrink on phones.`,
					blockId: block.id,
					severity: "warning",
					fix: { label: "Make it fill", styles: { width: "100%" } },
				});
			}
		}

		// A fixed width wider than a phone runs off the screen there; a max width does the same job on
		// large screens and still shrinks on small ones.
		const fixedPx = block.name === "core/image" || block.name === "post/featured-image" ? null : parsePxWidth(styles.width);
		const capPx = parsePxWidth(styles.maxWidth);
		const capped = styles.maxWidth === "100%" || (capPx !== null && capPx <= PHONE_SAFE_WIDTH_PX);
		if (fixedPx !== null && fixedPx > PHONE_SAFE_WIDTH_PX && !capped) {
			issues.push({
				code: "WIDE_FIXED_WIDTH",
				message: `"${blockName(block)}" is ${fixedPx}px wide, wider than a phone screen, so it runs off the edge there.`,
				blockId: block.id,
				severity: "warning",
				fix: { label: "Use max width instead", styles: { width: "100%", maxWidth: `${fixedPx}px` } },
			});
		}

		if (block.name === "core/table") {
			issues.push({
				code: "TABLE_CHECK_OVERFLOW",
				message: "Wide tables scroll horizontally on mobile. Check that content fits.",
				blockId: block.id,
				severity: "warning",
			});
		}
	});

	return { ok: issues.length === 0, issues };
}

/**
 * Applies every issue's one-click fix to the tree. Pure — returns new blocks and how many changed,
 * so the editor can commit it as one undo step alongside the mobile defaults.
 */
export function applyResponsiveHealthFixes(blocks: BlockConfig[]): { blocks: BlockConfig[]; fixedCount: number } {
	const fixes = new Map(
		validateBlockResponsiveHealth(blocks)
			.issues.filter((issue) => issue.fix)
			.map((issue) => [issue.blockId, issue.fix?.styles ?? {}] as const),
	);
	if (fixes.size === 0) return { blocks, fixedCount: 0 };
	const patch = (list: BlockConfig[]): BlockConfig[] =>
		list.map((block) => {
			const styles = fixes.get(block.id);
			const children = block.children?.length ? patch(block.children) : block.children;
			if (!styles) return children === block.children ? block : { ...block, children };
			return { ...block, children, styles: { ...(block.styles ?? {}), ...styles } };
		});
	return { blocks: patch(blocks), fixedCount: fixes.size };
}
