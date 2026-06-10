import { useCallback } from 'react';
import type { DropResult } from '@/lib/dnd';
import type { BlockConfig } from '@shared/schema-types';
import { insertNewBlock, moveExistingBlock } from '@/lib/handlers/treeUtils';
import { useToast } from '@/hooks/use-toast';
import { blockRegistry } from '@/components/PageBuilder/blocks';

// Helper: find a Columns block context by a column droppableId
function findColumnsContext(
  blocks: BlockConfig[],
  columnDroppableId: string,
): { columnsBlock: BlockConfig; columnIndex: number } | null {
  const stack: BlockConfig[] = [...blocks];
  while (stack.length) {
    const b = stack.shift()!;
    if (b.name === 'core/columns' && Array.isArray(b.settings?.columnLayout)) {
      const idx = (b.settings.columnLayout as any[]).findIndex(
        (c: any) => c?.columnId === columnDroppableId,
      );
      if (idx !== -1) return { columnsBlock: b, columnIndex: idx };
    }
    if (Array.isArray(b.children)) stack.push(...b.children);
  }
  return null;
}

// Compute global index inside a Columns block children array for a given column position
function computeGlobalIndexForColumn(
  columnsBlock: BlockConfig,
  columnId: string,
  desiredPos: number,
): number {
  const children = Array.isArray(columnsBlock.children)
    ? columnsBlock.children
    : [];
  const layout: any[] = Array.isArray(columnsBlock.settings?.columnLayout)
    ? (columnsBlock.settings!.columnLayout as any[])
    : [];
  const col = layout.find((c) => c?.columnId === columnId) || { blockIds: [] };
  const inColSet = new Set<string>(
    Array.isArray(col.blockIds) ? col.blockIds : [],
  );
  const indices: number[] = [];
  for (let i = 0; i < children.length; i++) {
    if (inColSet.has(children[i].id)) indices.push(i);
  }
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
  columnId: string,
  pos: number,
): number | null {
  const children = Array.isArray(columnsBlock.children)
    ? columnsBlock.children
    : [];
  const layout: any[] = Array.isArray(columnsBlock.settings?.columnLayout)
    ? (columnsBlock.settings!.columnLayout as any[])
    : [];
  const col = layout.find((c) => c?.columnId === columnId) || { blockIds: [] };
  const inColSet = new Set<string>(
    Array.isArray(col.blockIds) ? col.blockIds : [],
  );
  let count = -1;
  for (let i = 0; i < children.length; i++) {
    if (inColSet.has(children[i].id)) {
      count++;
      if (count === pos) return i;
    }
  }
  return null;
}

// Update Columns block columnLayout to add/remove/move a child id
function updateColumnAssignments(
  blocks: BlockConfig[],
  columnsBlockId: string,
  mutate: (layout: any[]) => any[],
): BlockConfig[] {
  const next = structuredClone(blocks) as BlockConfig[];
  const stack: { parent: BlockConfig | null; list: BlockConfig[] }[] = [
    { parent: null, list: next },
  ];
  while (stack.length) {
    const { list } = stack.shift()!;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (b.id === columnsBlockId) {
        const layout = Array.isArray(b.settings?.columnLayout)
          ? (b.settings!.columnLayout as any[])
          : [];
        const newLayout = mutate(layout);
        b.settings = { ...(b.settings || {}), columnLayout: newLayout };
        return next;
      }
      if (Array.isArray(b.children))
        stack.push({ parent: b, list: b.children });
    }
  }
  return next;
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
              sourceColCtx.columnsBlock.settings!.columnLayout[
                sourceColCtx.columnIndex
              ].columnId,
              source.index,
            )
          : source.index;

        // Resolve destination context
        const destIsCanvas =
          destination.droppableId === 'canvas' ||
          destination.droppableId.startsWith('block-library');
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
              destColCtx.columnsBlock.settings!.columnLayout[
                destColCtx.columnIndex
              ].columnId,
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
                    b.content = { ...c, postId: currentPostId } as BlockConfig['content'];
                  }
                  break;
                }
                if (Array.isArray(b.children)) stack.push(...b.children);
              }
            }
          }

          // If dropped into a Columns column, register assignment in columnLayout
          const withAssignment =
            destColCtx && inserted.newId
              ? updateColumnAssignments(
                  blocksWithPostId,
                  destColCtx.columnsBlock.id,
                  (layout) => {
                    const nextLayout = layout.map((c: any) => ({
                      ...c,
                      blockIds: Array.isArray(c.blockIds)
                        ? [...c.blockIds]
                        : [],
                    }));
                    const column = nextLayout[destColCtx.columnIndex];
                    // Ensure the id is not present in any column
                    nextLayout.forEach((c: any) => {
                      c.blockIds = c.blockIds.filter(
                        (id: string) => id !== inserted.newId,
                      );
                    });
                    const pos = Math.max(
                      0,
                      Math.min(destination.index, column.blockIds.length),
                    );
                    column.blockIds.splice(pos, 0, inserted.newId);
                    return nextLayout;
                  },
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

        const sameParent = sourceParentId === destParentId;
        if (
          sameParent &&
          (destination.index === source.index ||
            destination.index === source.index + 1)
        ) {
          return;
        }

        // Move existing
        if (sourceIndexGlobal == null) {
          toast({
            title: 'Failed to move block',
            description: 'Unknown source',
            variant: 'destructive',
          });
          return;
        }

        const moved = moveExistingBlock(
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

        // Adjust column assignments when moving between/within columns
        const withReassigned =
          sourceColCtx || destColCtx
            ? updateColumnAssignments(
                moved,
                (sourceColCtx ?? destColCtx!)!.columnsBlock.id,
                (layout) => {
                  const nextLayout = layout.map((c: any) => ({
                    ...c,
                    blockIds: Array.isArray(c.blockIds) ? [...c.blockIds] : [],
                  }));
                  // Remove from any column first
                  nextLayout.forEach((c: any) => {
                    c.blockIds = c.blockIds.filter(
                      (id: string) => id !== draggableId,
                    );
                  });
                  if (destColCtx) {
                    const destColumn = nextLayout[destColCtx.columnIndex];
                    const pos = Math.max(
                      0,
                      Math.min(destination.index, destColumn.blockIds.length),
                    );
                    destColumn.blockIds.splice(pos, 0, draggableId);
                  }
                  return nextLayout;
                },
              )
            : moved;

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
