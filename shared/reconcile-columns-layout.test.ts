import { describe, expect, it } from "vitest";
import type { ColumnLayout } from "./columns-layout";
import {
	canonicalColumnsFixture,
	emptyLayoutFixture,
	malformedMembershipFixture,
	missingLayoutFixture,
	nestedColumnsFixture,
} from "./test/fixtures/columns-reconciliation";
import { reconcileColumnLayouts } from "./reconcile-columns-layout";
import type { BlockConfig } from "./schema-types";

const getColumnsBlock = (blocks: BlockConfig[]): BlockConfig => {
	const block = blocks[0];
	if (!block) throw new Error("Expected columns fixture block");
	return block;
};

const getLayout = (block: BlockConfig): ColumnLayout[] => {
	const layout = block.settings?.columnLayout as ColumnLayout[] | undefined;
	if (!layout) throw new Error("Expected reconciled column layout");
	return layout;
};

describe("reconcileColumnLayouts", () => {
	it("leaves canonical trees untouched", () => {
		const result = reconcileColumnLayouts({ blocks: canonicalColumnsFixture });

		expect(result.blocks).toBe(canonicalColumnsFixture);
		expect(result.issues).toEqual([]);
		expect(result.changed).toBe(false);
	});

	it("removes stale references, dedupes memberships, and assigns orphans", () => {
		const before = structuredClone(malformedMembershipFixture);
		const result = reconcileColumnLayouts({ blocks: malformedMembershipFixture });
		const layout = getLayout(getColumnsBlock(result.blocks));

		expect(layout.map((column) => column.blockIds)).toEqual([
			["malformed-kept", "malformed-orphan"],
			["malformed-assigned"],
			[],
		]);
		expect(result.issues).toEqual([
			{
				code: "STALE_BLOCK_REFERENCE",
				columnsBlockId: "malformed-columns",
				blockId: "missing-one",
				columnId: "malformed-first",
			},
			{
				code: "DUPLICATE_BLOCK_MEMBERSHIP",
				columnsBlockId: "malformed-columns",
				blockId: "malformed-kept",
				columnId: "malformed-first",
				keptColumnId: "malformed-first",
			},
			{
				code: "DUPLICATE_BLOCK_MEMBERSHIP",
				columnsBlockId: "malformed-columns",
				blockId: "malformed-kept",
				columnId: "malformed-second",
				keptColumnId: "malformed-first",
			},
			{
				code: "STALE_BLOCK_REFERENCE",
				columnsBlockId: "malformed-columns",
				blockId: "missing-two",
				columnId: "malformed-second",
			},
			{
				code: "ORPHAN_CHILD",
				columnsBlockId: "malformed-columns",
				blockId: "malformed-orphan",
				columnId: "malformed-first",
			},
		]);
		expect(malformedMembershipFixture).toEqual(before);
		expect(result.changed).toBe(true);
	});

	it("ensures every direct child resolves to exactly one column", () => {
		const result = reconcileColumnLayouts({ blocks: malformedMembershipFixture });
		const block = getColumnsBlock(result.blocks);
		const childIds = new Set((block.children ?? []).map((child) => child.id));
		const memberships = getLayout(block).flatMap((column) => column.blockIds);

		expect(new Set(memberships)).toEqual(childIds);
		expect(memberships).toHaveLength(childIds.size);
	});

	it("creates a default column and preserves legacy orphan content", () => {
		const result = reconcileColumnLayouts({ blocks: missingLayoutFixture });
		const block = getColumnsBlock(result.blocks);

		expect(getLayout(block)).toEqual([
			{
				columnId: "default-col-1",
				width: "100%",
				blockIds: ["legacy-first", "legacy-second"],
			},
		]);
		expect(result.issues).toEqual([
			{
				code: "MISSING_COLUMN_LAYOUT",
				columnsBlockId: "legacy-columns",
			},
			{
				code: "ORPHAN_CHILD",
				columnsBlockId: "legacy-columns",
				blockId: "legacy-first",
				columnId: "default-col-1",
			},
			{
				code: "ORPHAN_CHILD",
				columnsBlockId: "legacy-columns",
				blockId: "legacy-second",
				columnId: "default-col-1",
			},
		]);
	});

	it("treats an empty persisted layout as missing", () => {
		const result = reconcileColumnLayouts({ blocks: emptyLayoutFixture });
		const block = getColumnsBlock(result.blocks);

		expect(getLayout(block)).toEqual([
			{
				columnId: "default-col-1",
				width: "100%",
				blockIds: ["empty-layout-child"],
			},
		]);
		expect(result.issues.map((issue) => issue.code)).toEqual([
			"MISSING_COLUMN_LAYOUT",
			"ORPHAN_CHILD",
		]);
		expect(result.changed).toBe(true);
	});

	it("is idempotent after repairing a legacy tree", () => {
		const repaired = reconcileColumnLayouts({ blocks: missingLayoutFixture });
		const secondPass = reconcileColumnLayouts({ blocks: repaired.blocks });

		expect(secondPass.blocks).toBe(repaired.blocks);
		expect(secondPass.issues).toEqual([]);
		expect(secondPass.changed).toBe(false);
	});

	it("reconciles nested columns globally in stable traversal order", () => {
		const result = reconcileColumnLayouts({ blocks: nestedColumnsFixture });
		const outer = getColumnsBlock(result.blocks);
		const nested = outer.children?.[0];

		if (!nested) throw new Error("Expected nested columns fixture block");

		expect(getLayout(nested).map((column) => column.blockIds)).toEqual([
			["nested-kept", "nested-orphan"],
			[],
		]);
		expect(result.issues).toEqual([
			{
				code: "STALE_BLOCK_REFERENCE",
				columnsBlockId: "nested-columns",
				blockId: "nested-stale",
				columnId: "nested-only",
			},
			{
				code: "ORPHAN_CHILD",
				columnsBlockId: "nested-columns",
				blockId: "nested-orphan",
				columnId: "nested-only",
			},
		]);
	});

	it("repairs malformed runtime layouts without mutating the input", () => {
		const blocks: BlockConfig[] = [
			{
				id: "malformed-runtime-columns",
				name: "core/columns",
				type: "container",
				parentId: null,
				content: { kind: "structured", data: {} },
				settings: {
					columnLayout: [
						null,
						{
							columnId: "runtime-valid",
							blockIds: ["runtime-child", 42],
							label: "Keep metadata",
						},
						{
							columnId: 7,
							blockIds: ["runtime-child"],
						},
					],
				},
				children: [
					{
						id: "runtime-child",
						name: "core/paragraph",
						type: "block",
						parentId: "malformed-runtime-columns",
						content: { kind: "text", value: "Child" },
					},
				],
			},
		];
		const before = structuredClone(blocks);

		const result = reconcileColumnLayouts({ blocks });
		const layout = getLayout(getColumnsBlock(result.blocks));

		expect(layout).toEqual([
			{
				columnId: "runtime-valid",
				blockIds: ["runtime-child"],
				label: "Keep metadata",
			},
		]);
		expect(result.changed).toBe(true);
		expect(result.issues).toEqual([]);
		expect(blocks).toEqual(before);
	});
});
