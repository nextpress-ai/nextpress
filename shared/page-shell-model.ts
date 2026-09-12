import type { BlockConfig, BlockContent, PageDesignSettings, TokenEntry } from "./schema-types.js";
import { DEFAULT_PAGE_DESIGN } from "./page-other.js";

export const PAGE_SHELL_BLOCK_NAME = "core/page-shell";

export const PAGE_SHELL_WIDTH_OPTIONS = [
	{ value: "960px", label: "960px" },
	{ value: "1024px", label: "1024px" },
	{ value: "1200px", label: "1200px" },
	{ value: "1440px", label: "1440px" },
	{ value: "100%", label: "Full width" },
] as const;

export type PageShellContent = {
	fontFamily: string;
	containerWidth: string;
	padding: string;
	backgroundColor?: TokenEntry;
	textColor?: TokenEntry;
};

export const DEFAULT_PAGE_SHELL_CONTENT: PageShellContent = {
	fontFamily: DEFAULT_PAGE_DESIGN.fontFamily ?? "system-ui",
	containerWidth: DEFAULT_PAGE_DESIGN.containerWidth ?? "1200px",
	padding: DEFAULT_PAGE_DESIGN.padding ?? "2rem 1rem",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const readToken = (value: unknown): TokenEntry | undefined => {
	if (!isRecord(value)) return undefined;
	if (typeof value.property !== "string" || typeof value.alias !== "string") return undefined;
	return value as unknown as TokenEntry;
};

/** Unwrap structured or flat shell content. Missing keys fall back to defaults. */
export function readPageShellContent(content: BlockContent | undefined): PageShellContent {
	const data = unwrapStructured(content);
	return {
		fontFamily:
			typeof data.fontFamily === "string" && data.fontFamily
				? data.fontFamily
				: DEFAULT_PAGE_SHELL_CONTENT.fontFamily,
		containerWidth:
			typeof data.containerWidth === "string" && data.containerWidth
				? data.containerWidth
				: DEFAULT_PAGE_SHELL_CONTENT.containerWidth,
		padding:
			typeof data.padding === "string" && data.padding
				? data.padding
				: DEFAULT_PAGE_SHELL_CONTENT.padding,
		backgroundColor: readToken(data.backgroundColor),
		textColor: readToken(data.textColor),
	};
}

export function unwrapStructured(content: BlockContent | undefined): Record<string, unknown> {
	if (!content || typeof content !== "object") return {};
	if ("kind" in content && content.kind === "structured") {
		return isRecord(content.data) ? content.data : {};
	}
	return content as Record<string, unknown>;
}

export function findRootPageShell(blocks: BlockConfig[]): BlockConfig | null {
	const roots = Array.isArray(blocks) ? blocks : [];
	return roots.find((block) => block.name === PAGE_SHELL_BLOCK_NAME) ?? null;
}

/**
 * Page design comes from the root shell only. Leftover `page.other.design` is ignored.
 */
export function readPageDesign({ blocks }: { blocks: BlockConfig[] }): PageDesignSettings {
	const shell = findRootPageShell(blocks);
	if (!shell) return { ...DEFAULT_PAGE_DESIGN };
	const content = readPageShellContent(shell.content);
	return {
		fontFamily: content.fontFamily,
		containerWidth: content.containerWidth,
		padding: content.padding,
		backgroundColor: content.backgroundColor,
		textColor: content.textColor,
	};
}

export function isFullBleedPageShellChild(block: BlockConfig): boolean {
	return block.name === "core/header";
}

function designToShellContent(design: PageDesignSettings | undefined): PageShellContent {
	return {
		fontFamily: design?.fontFamily || DEFAULT_PAGE_SHELL_CONTENT.fontFamily,
		containerWidth: design?.containerWidth || DEFAULT_PAGE_SHELL_CONTENT.containerWidth,
		padding: design?.padding || DEFAULT_PAGE_SHELL_CONTENT.padding,
		backgroundColor: design?.backgroundColor,
		textColor: design?.textColor,
	};
}

function buildEmptyShell({
	shellId,
	leftoverDesign,
	children,
}: {
	shellId: string;
	leftoverDesign?: PageDesignSettings;
	children: BlockConfig[];
}): BlockConfig {
	const content = designToShellContent(leftoverDesign);
	return {
		id: shellId,
		name: PAGE_SHELL_BLOCK_NAME,
		label: "Page shell",
		type: "container",
		parentId: null,
		category: "layout",
		content: { kind: "structured", data: content },
		styles: {
			width: "100%",
			boxSizing: "border-box",
			padding: "0px",
			margin: "0px",
		},
		settings: {},
		other: {
			tokenMap: {},
			units: { spacing: "px", font: "rem", dimension: "px", border: "px" },
		},
		children: children.map((child) => ({ ...child, parentId: shellId })),
	};
}

/**
 * Every page must have one root shell. Seeds leftover page.other.design once
 * when wrapping old flat trees so the published look does not jump.
 */
export function ensureRootPageShell({
	blocks,
	leftoverDesign,
	shellId,
}: {
	blocks: BlockConfig[];
	leftoverDesign?: PageDesignSettings;
	shellId: string;
}): { blocks: BlockConfig[]; didWrap: boolean } {
	const roots = Array.isArray(blocks) ? blocks : [];
	const shell = findRootPageShell(roots);
	if (shell && roots.length === 1) {
		return { blocks: roots, didWrap: false };
	}
	if (shell && roots.length > 1) {
		const extras = roots.filter((block) => block.id !== shell.id);
		const nextChildren = [
			...(Array.isArray(shell.children) ? shell.children : []),
			...extras.map((child) => ({ ...child, parentId: shell.id })),
		];
		return {
			blocks: [{ ...shell, parentId: null, children: nextChildren }],
			didWrap: true,
		};
	}
	return {
		blocks: [buildEmptyShell({ shellId, leftoverDesign, children: roots })],
		didWrap: true,
	};
}

/**
 * Visitor and SSR always render through a root shell. Old published trees
 * are wrapped in memory from leftover design so the look does not jump.
 */
export function prepareVisitorPageBlocks({
	blocks,
	leftoverDesign,
}: {
	blocks: BlockConfig[];
	leftoverDesign?: PageDesignSettings;
}): BlockConfig[] {
	return ensureRootPageShell({
		blocks,
		leftoverDesign,
		shellId: "page-shell-root",
	}).blocks;
}
