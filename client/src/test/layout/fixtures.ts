import type { BlockConfig } from "@shared/schema-types";

const base = (partial: Partial<BlockConfig> & Pick<BlockConfig, "id" | "name">): BlockConfig => ({
	type: partial.children ? "container" : "block",
	parentId: null,
	content: { kind: "structured", data: {} },
	styles: {},
	settings: {},
	...partial,
});

export const heading = (id: string, text: string, styles?: BlockConfig["styles"]): BlockConfig =>
	base({
		id,
		name: "core/heading",
		type: "block",
		content: { kind: "text", value: text, level: 2 },
		styles,
	});

export const paragraph = (id: string, text: string, styles?: BlockConfig["styles"]): BlockConfig =>
	base({
		id,
		name: "core/paragraph",
		type: "block",
		content: { kind: "text", value: text },
		styles,
	});

/** Frozen old Group — display block, padding only. Must not migrate. */
export const oldBlockGroup: BlockConfig = base({
	id: "old-group",
	name: "core/group",
	type: "container",
	styles: { padding: "1rem 1.25rem", width: "100%", boxSizing: "border-box" },
	children: [heading("old-h", "Old heading"), paragraph("old-p", "Old paragraph")],
});

export const flexColumnGroup: BlockConfig = base({
	id: "flex-col-group",
	name: "core/group",
	type: "container",
	styles: {
		display: "flex",
		flexDirection: "column",
		gap: "16px",
		justifyContent: "flex-start",
		alignItems: "flex-start",
		width: "100%",
	},
	children: [heading("fc-h", "Stacked"), paragraph("fc-p", "Below")],
});

export const flexRowGroup: BlockConfig = base({
	id: "flex-row-group",
	name: "core/group",
	type: "container",
	styles: {
		display: "flex",
		flexDirection: "row",
		flexWrap: "nowrap",
		gap: "1rem",
		justifyContent: "flex-start",
		alignItems: "center",
		width: "100%",
	},
	children: [
		heading("fr-h", "Hug me", { width: "fit-content" }),
		paragraph("fr-p", "Fill me", { width: "100%" }),
		paragraph("fr-fixed", "Fixed", { width: "320px" }),
	],
});

export const oldRowUnsetChildren: BlockConfig = base({
	id: "old-row",
	name: "core/group",
	type: "container",
	styles: { display: "flex", flexDirection: "row", gap: "8px" },
	children: [heading("or-h", "A"), paragraph("or-p", "B")],
});

export const containerWithColumns: BlockConfig = base({
	id: "wrap-container",
	name: "core/container",
	type: "container",
	styles: {
		padding: "24px",
		width: "100%",
		maxWidth: "100%",
		display: "flex",
		flexDirection: "column",
		gap: "1rem",
	},
	children: [
		base({
			id: "inner-columns",
			name: "core/columns",
			type: "container",
			parentId: "wrap-container",
			styles: { display: "flex", flexDirection: "row", gap: "20px" },
			content: {
				kind: "structured",
				data: { layoutMode: "flex", gap: "20px", direction: "row" },
			},
			settings: {
				columnLayout: [
					{ columnId: "c1", width: "50%", blockIds: ["col-a"] },
					{ columnId: "c2", width: "50%", blockIds: ["col-b"] },
				],
			},
			children: [paragraph("col-a", "Left"), paragraph("col-b", "Right")],
		}),
	],
});

export const childPinnedRight: BlockConfig = base({
	id: "pin-parent",
	name: "core/group",
	type: "container",
	styles: { display: "flex", flexDirection: "column", gap: "8px", minHeight: "12rem" },
	children: [
		heading("pinned", "Right", { contentAlignHorizontal: "right" } as BlockConfig["styles"]),
	],
});
