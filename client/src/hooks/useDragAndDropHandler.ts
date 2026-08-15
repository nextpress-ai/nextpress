import { useCallback } from 'react';
import type { DropResult } from '@/lib/dnd';
import type { BlockConfig } from '@shared/schema-types';
import {
  readColumnLayoutFromBlock,
  type ColumnLayout,
} from '@shared/columns-layout';
import { insertNewBlock, moveExistingBlock } from '@/lib/handlers/treeUtils';
import { useToast } from '@/hooks/use-toast';
import { blockRegistry } from '@/components/PageBuilder/blocks';
import { buildColumnDroppableId } from '@/components/PageBuilder/blocks/columns/columns-model';

type ColumnsContext = {
  columnsBlock: BlockConfig;
  columnIndex: number;
};

type LayoutMutation = (layout: ColumnLayout[]) => ColumnLayout[];

const getColumnLayout = (block: BlockConfig): ColumnLayout[] =>
  readColumnLayoutFromBlock({
    settings: block.settings,
    content: block.content,
    children: block.children,
  });

// Helper: find a Columns block context by its scoped column droppableId.
function findColumnsContext(
  blocks: BlockConfig[],
  columnDroppableId: string,
): ColumnsContext | null {
  const stack: BlockConfig[] = [...blocks];
  while (stack.length) {
    const block = stack.shift();
    if (!block) continue;
    if (block.name === 'core/columns') {
      const layout = getColumnLayout(block);
      const idx = layout.findIndex(
        (column, columnIndex) =>
          buildColumnDroppableId({
            columnsBlockId: block.id,
            columnId: column.columnId,
            columnIndex,
          }) === columnDroppableId,
      );
      if (idx !== -1) return { columnsBlock: block, columnIndex: idx };
    }
    if (Array.isArray(block.children)) stack.push(...block.children);
  }
  return null;
}

// Compute global index inside a Columns block children array for a given column position
function computeGlobalIndexForColumn(
  columnsBlock: BlockConfig,
  columnIndex: number,
  desiredPos: number,
): number {
  const children = Array.isArray(columnsBlock.children)
    ? columnsBlock.children
    : [];
  const col = getColumnLayout(columnsBlock)[columnIndex];
  const inColSet = new Set<string>(
    col?.blockIds ?? [],
  );
  const indices = children
    .map((child, index) => (inColSet.has(child.id) ? index : null))
    .filter((index): index is number => index !== null);
  if (desiredPos <= 0) {
    return indices.length > 0 ? indices[0] : children.length; // before first or at end if empty
  }
  if (desiredPos >= indices.length) {
    return children.length; // append at end of columns children
  }
  return indices[desiredPos]; // insert before the item currently at this column position
}

// Compute global index of existing item at column position (for source)
function getGlobalIndexAtColumnPosition(
  columnsBlock: BlockConfig,
  columnIndex: number,
  pos: number,
): number | null {
  const children = Array.isArray(columnsBlock.children)
    ? columnsBlock.children
    : [];
  const col = getColumnLayout(columnsBlock)[columnIndex];
  const inColSet = new Set<string>(
    col?.blockIds ?? [],
  );
  return children
    .map((child, index) => (inColSet.has(child.id) ? index : null))
    .filter((index): index is number => index !== null)[pos] ?? null;
}

// Update Columns block columnLayout to add/remove/move a child id
function updateColumnAssignments(
  blocks: BlockConfig[],
  columnsBlockId: string,
  mutate: LayoutMutation,
): BlockConfig[] {
  const next = structuredClone(blocks) as BlockConfig[];
  const stack: BlockConfig[] = [...next];
  while (stack.length) {
    const block = stack.shift();
    if (!block) continue;
    if (block.id === columnsBlockId) {
      const layout = mutate(getColumnLayout(block));
      block.settings = { ...(block.settings || {}), columnLayout: layout };
      return next;
    }
    if (Array.isArray(block.children)) stack.push(...block.children);
  }
  return next;
}

function removeFromColumnAssignments(
  layout: ColumnLayout[],
  blockId: string,
): ColumnLayout[] {
  return layout.map((column) => ({
    ...column,
    blockIds: column.blockIds.filter((id) => id !== blockId),
  }));
}

function addToColumnAssignment({
  layout,
  columnIndex,
  blockId,
  position,
}: {
  layout: ColumnLayout[];
  columnIndex: number;
  blockId: string;
  position: number;
}): ColumnLayout[] {
  const nextLayout = removeFromColumnAssignments(layout, blockId);
  const column = nextLayout[columnIndex];
  if (!column) return nextLayout;

  const nextBlockIds = [...column.blockIds];
  const targetPosition = Math.max(0, Math.min(position, nextBlockIds.length));
  nextBlockIds.splice(targetPosition, 0, blockId);
  nextLayout[columnIndex] = { ...column, blockIds: nextBlockIds };
  return nextLayout;
}

export function useDragAndDropHandler(
  blocks: BlockConfig[],
  setBlocks: (blocks: BlockConfig[]) => void,
  setSelectedBlockId: (id: string) => void,
  setActiveTab: (tab: 'blocks' | 'settings') => void,
  currentPostId?: string,
) {
  const { toast } = useToast();

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const { source, destination, draggableId } = result;

      try {
        const isFromLibrary = source.droppableId.startsWith('block-library');
        if (destination.droppableId.startsWith('block-library')) return;

        // Resolve source context
        const sourceIsCanvas =
          source.droppableId === 'canvas' ||
          source.droppableId.startsWith('block-library');
        const sourceColCtx = !sourceIsCanvas
          ? findColumnsContext(blocks, source.droppableId)
          : null;
        const sourceParentId: string | null = sourceIsCanvas
          ? null
          : sourceColCtx
            ? sourceColCtx.columnsBlock.id
            : source.droppableId;
        const sourceIndexGlobal: number | null = sourceColCtx
          ? getGlobalIndexAtColumnPosition(
              sourceColCtx.columnsBlock,
              sourceColCtx.columnIndex,
              source.index,
            )
          : source.index;

        // Resolve destination context
        const destIsCanvas = destination.droppableId === 'canvas';
        const destColCtx = !destIsCanvas
          ? findColumnsContext(blocks, destination.droppableId)
          : null;
        const destParentId: string | null = destIsCanvas
          ? null
          : destColCtx
            ? destColCtx.columnsBlock.id
            : destination.droppableId;
        const destIndexGlobal: number = destColCtx
          ? computeGlobalIndexForColumn(
              destColCtx.columnsBlock,
              destColCtx.columnIndex,
              destination.index,
            )
          : destination.index;

        if (isFromLibrary) {
          const inserted = insertNewBlock(
            blocks,
            destParentId,
            destIndexGlobal,
            draggableId,
          );
          if (inserted.blocks === blocks) {
            toast({
              title: 'Failed to add block',
              description: 'Could not insert block at the specified location',
              variant: 'destructive',
            });
            return;
          }

          // Auto-populate postId for post-category blocks when currentPostId is available
          let blocksWithPostId = inserted.blocks;
          if (currentPostId && inserted.newId) {
            const blockDef = blockRegistry[draggableId];
            // Check for postId in defaultContent — handles both flat objects
            // and structured { kind: "structured", data: { postId } } wrapping
            const hasPostId = blockDef?.defaultContent && typeof blockDef.defaultContent === 'object' && (
              'postId' in (blockDef.defaultContent as Record<string, unknown>)
              || (
                (blockDef.defaultContent as Record<string, unknown>).kind === 'structured'
                && typeof (blockDef.defaultContent as Record<string, unknown>).data === 'object'
                && 'postId' in ((blockDef.defaultContent as Record<string, unknown>).data as Record<string, unknown>)
              )
            );
            if (
              blockDef &&
              blockDef.category === 'post' &&
              hasPostId
            ) {
              blocksWithPostId = structuredClone(
                inserted.blocks,
              ) as BlockConfig[];
              const stack: BlockConfig[] = [...blocksWithPostId];
              while (stack.length) {
                const b = stack.shift()!;
                if (b.id === inserted.newId) {
                  // Inject postId into structured or flat content
                  const c = b.content as Record<string, unknown>;
                  if (c?.kind === 'structured' && typeof c.data === 'object' && c.data !== null) {
                    (c.data as Record<string, unknown>).postId = currentPostId;
                  } else {
                    b.content = { ...c, postId: currentPostId } as unknown as BlockConfig['content'];
                  }
                  break;
                }
                if (Array.isArray(b.children)) stack.push(...b.children);
              }
            }
          }

          // If dropped into a Columns column, register assignment in columnLayout
          const insertedNewId = inserted.newId;
          const withAssignment =
            destColCtx && insertedNewId
              ? updateColumnAssignments(
                  blocksWithPostId,
                  destColCtx.columnsBlock.id,
                  (layout) =>
                    addToColumnAssignment({
                      layout,
                      columnIndex: destColCtx.columnIndex,
                      blockId: insertedNewId,
                      position: destination.index,
                    }),
                )
              : blocksWithPostId;

          setBlocks(withAssignment);
          if (inserted.newId) {
            setSelectedBlockId(inserted.newId);
            setActiveTab('settings');
          }
          return;
        }

        // Early invalid guard: prevent drops into self container
        if (
          (destColCtx ? destColCtx.columnsBlock.id : destParentId) ===
          draggableId
        ) {
          toast({
            title: 'Invalid drop',
            description: 'You can’t drop a block into itself.',
            variant: 'destructive',
          });
          return;
        }

        const sameDroppable = source.droppableId === destination.droppableId;
        if (
          sameDroppable &&
          (destination.index === source.index ||
            destination.index === source.index + 1)
        ) {
          return;
        }

        // Move existing. Column membership lives in columnLayout while the
        // children array is shared storage, so same-columns-block moves only
        // reassign membership instead of reordering shared children.
        const sameColumnsBlock =
          sourceColCtx &&
          destColCtx &&
          sourceColCtx.columnsBlock.id === destColCtx.columnsBlock.id;

        if (sourceIndexGlobal == null) {
          toast({
            title: 'Failed to move block',
            description: 'Unknown source',
            variant: 'destructive',
          });
          return;
        }

        let moved = blocks;
        if (!sameColumnsBlock) {
          moved = moveExistingBlock(
            blocks,
            sourceParentId,
            sourceIndexGlobal,
            destParentId,
            destIndexGlobal,
          );
          if (moved === blocks) {
            toast({
              title: 'Failed to move block',
              description: 'Could not move block to the specified location',
              variant: 'destructive',
            });
            return;
          }
        }

        // Remove source membership, then add destination membership. Separate
        // updates are required when columns belong to different blocks.
        let withReassigned = moved;
        if (sourceColCtx) {
          withReassigned = updateColumnAssignments(
            withReassigned,
            sourceColCtx.columnsBlock.id,
            (layout) => removeFromColumnAssignments(layout, draggableId),
          );
        }
        if (destColCtx) {
          withReassigned = updateColumnAssignments(
            withReassigned,
            destColCtx.columnsBlock.id,
            (layout) =>
              addToColumnAssignment({
                layout,
                columnIndex: destColCtx.columnIndex,
                blockId: draggableId,
                position: destination.index,
              }),
          );
        }

        setBlocks(withReassigned);
        setSelectedBlockId(draggableId);
        setActiveTab('settings');
      } catch (error) {
        console.error('Drag and drop error:', error);
        toast({
          title: 'Drag operation failed',
          description: 'An unexpected error occurred while moving the block.',
          variant: 'destructive',
        });
      }
    },
    [blocks, setBlocks, setSelectedBlockId, setActiveTab, toast, currentPostId],
  );

  return { handleDragEnd };
}
