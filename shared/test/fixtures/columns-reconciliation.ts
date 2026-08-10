import type { ColumnLayout } from "../../columns-layout";
import type { BlockConfig } from "../../schema-types";

const makeChild = ({
	id,
	parentId,
}: {
	id: string;
	parentId: string;
}): BlockConfig => ({
	id,
	name: "core/paragraph",
	type: "block",
	parentId,
	content: { kind: "text", value: id },
});

const makeColumns = ({
	id,
	layout,
	children = [],
}: {
	id: string;
	layout?: ColumnLayout[];
	children?: BlockConfig[];
}): BlockConfig => ({
	id,
	name: "core/columns",
	type: "container",
	parentId: null,
	content: { kind: "structured", data: {} },
	settings: layout === undefined ? {} : { columnLayout: layout },
	children,
});

export const canonicalColumnsFixture: BlockConfig[] = [
	makeColumns({
		id: "canonical-columns",
		layout: [
			{ columnId: "canonical-left", width: "50%", blockIds: ["canonical-a"] },
			{ columnId: "canonical-right", width: "50%", blockIds: ["canonical-b"] },
		],
		children: [
			makeChild({ id: "canonical-a", parentId: "canonical-columns" }),
			makeChild({ id: "canonical-b", parentId: "canonical-columns" }),
		],
	}),
];

export const malformedMembershipFixture: BlockConfig[] = [
	makeColumns({
		id: "malformed-columns",
		layout: [
			{
				columnId: "malformed-first",
				width: "33.33%",
				blockIds: ["malformed-kept", "missing-one", "malformed-kept"],
			},
			{
				columnId: "malformed-second",
				width: "33.33%",
				blockIds: ["malformed-assigned", "malformed-kept", "missing-two"],
			},
			{
				columnId: "malformed-third",
				width: "33.33%",
				blockIds: [],
			},
		],
		children: [
			makeChild({ id: "malformed-orphan", parentId: "malformed-columns" }),
			makeChild({ id: "malformed-kept", parentId: "malformed-columns" }),
			makeChild({ id: "malformed-assigned", parentId: "malformed-columns" }),
		],
	}),
];

export const missingLayoutFixture: BlockConfig[] = [
	makeColumns({
		id: "legacy-columns",
		children: [
			makeChild({ id: "legacy-first", parentId: "legacy-columns" }),
			makeChild({ id: "legacy-second", parentId: "legacy-columns" }),
		],
	}),
];

export const emptyLayoutFixture: BlockConfig[] = [
	makeColumns({
		id: "empty-layout-columns",
		layout: [],
		children: [makeChild({ id: "empty-layout-child", parentId: "empty-layout-columns" })],
	}),
];

const nestedColumns = makeColumns({
	id: "nested-columns",
	layout: [
		{ columnId: "nested-only", width: "50%", blockIds: ["nested-kept", "nested-stale"] },
		{ columnId: "nested-empty", width: "50%", blockIds: [] },
	],
	children: [
		makeChild({ id: "nested-kept", parentId: "nested-columns" }),
		makeChild({ id: "nested-orphan", parentId: "nested-columns" }),
	],
});

export const nestedColumnsFixture: BlockConfig[] = [
	makeColumns({
		id: "outer-columns",
		layout: [
			{ columnId: "outer-first", width: "50%", blockIds: ["nested-columns"] },
			{ columnId: "outer-second", width: "50%", blockIds: ["outer-child"] },
		],
		children: [
			nestedColumns,
			makeChild({ id: "outer-child", parentId: "outer-columns" }),
		],
	}),
];
