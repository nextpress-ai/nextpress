import React from 'react';
import { Droppable, Draggable, DropPlaceholder } from '@/lib/dnd';
import DevicePreview from './DevicePreview';
import BlockRenderer from './BlockRenderer';
import { BlockAnimationRuntime } from './BlockAnimationRuntime';
import { Layers } from 'lucide-react';
import { useBlockActions } from './BlockActionsContext';
import type { BlockConfig } from "@shared/schema-types";
import { getBlockSiblingFlexItemStyles, PAGE_BLOCK_STACK_GAP } from "@shared/block-container-placement";

export function BuilderCanvas({
  blocks,
  deviceView,
  selectedBlockId,
  isPreviewMode,
  duplicateBlock,
  deleteBlock,
  hoverHighlight,
  onBlockChange,
}: {
  blocks: BlockConfig[];
  deviceView: 'desktop' | 'tablet' | 'mobile';
  selectedBlockId: string | null;
  isPreviewMode: boolean;
  duplicateBlock: (blockId: string) => void;
  deleteBlock: (blockId: string) => void;
  hoverHighlight: 'padding' | 'margin' | null;
  onBlockChange?: (updated: any) => void;
}) {
  const actions = useBlockActions();
  return (
    <div className="flex-1 overflow-auto bg-npb-canvas-bg p-8 min-h-0">
      <DevicePreview device={deviceView}>
        <div className="bg-npb-canvas-page min-h-full shadow-lg">
          <Droppable droppableId="canvas">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                role="region"
                aria-label="Canvas"
                className={`min-h-full p-4 flex flex-col items-stretch w-full ${snapshot.isDraggingOver ? 'bg-npb-accent/10' : ''}`}
                style={{ gap: PAGE_BLOCK_STACK_GAP }}
              >
                {blocks.length === 0 ? (
                  <div className="text-center py-12 text-npb-text-muted">
                    <Layers className="w-12 h-12 mx-auto mb-4" />
                    <p>Drag blocks from the sidebar to start building your page</p>
                  </div>
                ) : (
                  <>
                    {isPreviewMode && (
                      <BlockAnimationRuntime
                        contentKey={`builder-preview-${blocks.length}`}
                      />
                    )}
                    {blocks.map((block, index) => (
                    <React.Fragment key={block.id}>
                    {snapshot.placeholderIndex === index && <DropPlaceholder />}
                    <Draggable draggableId={block.id} index={index}>
                      {(provided, snapshot) => (
                         <div
                           ref={provided.innerRef}
                           {...provided.draggableProps}
                           className={`relative group ${snapshot.isDragging ? 'opacity-50' : ''}`}
                           style={{
                             width: '100%',
                             minWidth: 0,
                             ...getBlockSiblingFlexItemStyles(block.styles, 'column'),
                           }}
                           onClick={() => {
                             actions?.onSelect(block.id);
                           }}
                         >
                           <BlockRenderer
                             block={block}
                             isSelected={selectedBlockId === block.id}
                             isPreview={isPreviewMode}
                             onDuplicate={() => duplicateBlock(block.id)}
                             onDelete={() => deleteBlock(block.id)}
                             hoverHighlight={selectedBlockId === block.id ? hoverHighlight : null}
                             dragHandleProps={provided.dragHandleProps}
                             onBlockChange={onBlockChange}
                           />
                        </div>
                      )}
                    </Draggable>
                    </React.Fragment>
                  ))}
                  {snapshot.placeholderIndex === blocks.length && <DropPlaceholder />}
                  </>
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      </DevicePreview>
    </div>
  );
}
