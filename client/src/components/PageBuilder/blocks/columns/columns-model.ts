/**
 * Columns block data model: default content plus pure column-layout helpers
 * (clone, redistribute, remove). No React here — see `columns-settings.tsx`.
 */
import type { BlockConfig } from "@shared/schema-types";
import { generateBlockId } from "../../utils";
import type { ColumnLayout, ColumnsContent } from "@shared/columns-layout";

export const DEFAULT_CONTENT: ColumnsContent = {
  kind: "structured",
  data: {
    layoutMode: "flex",
    gap: "20px",
    minColumnWidth: "220px",
    verticalAlignment: "top",
    horizontalAlignment: "left",
    direction: "row",
    columnVerticalAlignment: "top",
    columnHorizontalAlignment: "stretch",
  },
};

function cloneColumnLayout(layout: ColumnLayout[]): ColumnLayout[] {
  return layout.map((column) => ({
    ...column,
    blockIds: [...column.blockIds],
  }));
}

function getOrderedChildIds(
  children: BlockConfig[],
  layout: ColumnLayout[],
): string[] {
  const childIds = children.map((child) => child.id);
  const assignedIds = new Set(
    layout.flatMap((column) =>
      Array.isArray(column.blockIds) ? column.blockIds : [],
    ),
  );

  return childIds.filter((id) => assignedIds.has(id)).concat(
    childIds.filter((id) => !assignedIds.has(id)),
  );
}

/**
 * Builds a new column layout and redistributes existing child blocks evenly.
 */
export function buildColumnsLayout(
  count: number,
  children: BlockConfig[],
  previousLayout: ColumnLayout[],
): ColumnLayout[] {
  const safeCount = Math.max(1, count);
  const width = `${(100 / safeCount).toFixed(2)}%`;
  const orderedChildIds = getOrderedChildIds(children, previousLayout);
  const nextLayout: ColumnLayout[] = Array.from({ length: safeCount }, () => ({
    columnId: `col-${generateBlockId()}`,
    width,
    blockIds: [],
  }));

  orderedChildIds.forEach((childId, index) => {
    nextLayout[index % safeCount].blockIds.push(childId);
  });

  return nextLayout;
}

/**
 * Removes a column and returns the remaining layout plus kept children.
 */
export function removeColumnAndCleanup(
  layout: ColumnLayout[],
  index: number,
  children: BlockConfig[],
): { nextLayout: ColumnLayout[]; nextChildren: BlockConfig[] } {
  if (layout.length <= 1) {
    return {
      nextLayout: cloneColumnLayout(layout),
      nextChildren: [...children],
    };
  }

  const nextLayout = cloneColumnLayout(layout);
  const [removedColumn] = nextLayout.splice(index, 1);
  if (!removedColumn) {
    return {
      nextLayout: cloneColumnLayout(layout),
      nextChildren: [...children],
    };
  }

  const removedIds = new Set(removedColumn.blockIds);
  nextLayout.forEach((column) => {
    column.blockIds = column.blockIds.filter((blockId) => !removedIds.has(blockId));
  });

  return {
    nextLayout,
    nextChildren: children.filter((child) => !removedIds.has(child.id)),
  };
}
