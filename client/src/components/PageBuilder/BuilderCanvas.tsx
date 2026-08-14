import React from 'react';
import { Droppable, Draggable, DropPlaceholder } from '@/lib/dnd';
import DevicePreview from './DevicePreview';
import { IframeDevicePreview } from './IframeDevicePreview';
import BlockRenderer from './BlockRenderer';
import { Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBlockActions } from './BlockActionsContext';
import { useMotionEnabled } from '@/lib/use-prefers-reduced-motion';
import { pageEnterVariants, MOTION_PAGE } from '@/lib/motion-presets';
import type { BlockConfig } from "@shared/schema-types";
import { getBlockSiblingFlexItemStyles, PAGE_BLOCK_STACK_GAP } from "@shared/block-container-placement";
import { blockRegistry } from './blocks';

export function BuilderCanvas({
  blocks,
  deviceView,
  selectedBlockId,
  isPreviewMode,
  previewUrl,
  previewRefreshKey,
  duplicateBlock,
  deleteBlock,
  hoverHighlight,
  onBlockChange,
}: {
  blocks: BlockConfig[];
  deviceView: 'desktop' | 'tablet' | 'mobile';
  selectedBlockId: string | null;
  isPreviewMode: boolean;
  previewUrl?: string;
  previewRefreshKey?: number;
  duplicateBlock: (blockId: string) => void;
  deleteBlock: (blockId: string) => void;
  hoverHighlight: 'padding' | 'margin' | null;
  onBlockChange?: (updated: any) => void;
}) {
  const actions = useBlockActions();
  const motionEnabled = useMotionEnabled();

  const emptyCanvas = (
    <div
      className="pointer-events-none py-10 text-center text-npb-text-muted"
      role="status">
      <Layers className="mx-auto mb-3 h-10 w-10" aria-hidden />
      <p className="text-sm">Drag blocks from the library to start</p>
      <p className="mt-1 text-xs text-npb-text-muted">Select a block on the canvas to edit settings</p>
    </div>
  );

  const renderEditorStack = () => (
    <Droppable droppableId="canvas">
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          id="builder-canvas"
          role="region"
          aria-label="Page canvas"
          tabIndex={-1}
          className={`min-h-full p-4 flex flex-col items-stretch w-full ${snapshot.isDraggingOver ? 'bg-npb-accent/10' : ''}`}
          style={{ gap: PAGE_BLOCK_STACK_GAP }}
          onClick={() => actions?.onSelect(null)}
        >
          {blocks.length === 0 ? (
            motionEnabled ? (
              <motion.div
                variants={pageEnterVariants}
                initial="hidden"
                animate="visible"
                transition={MOTION_PAGE}>
                {emptyCanvas}
              </motion.div>
            ) : (
              emptyCanvas
            )
          ) : null}
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
                    tabIndex={0}
                    role="group"
                    aria-label={`${blockRegistry[block.name]?.label ?? block.name} block`}
                    aria-current={selectedBlockId === block.id ? 'true' : undefined}
                    onClick={(event) => {
                      event.stopPropagation();
                      actions?.onSelect(block.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        actions?.onSelect(block.id);
                      }
                    }}
                  >
                    <BlockRenderer
                      block={block}
                      isSelected={selectedBlockId === block.id}
                      isPreview={false}
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
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );

  return (
    <div
      className="flex-1 overflow-auto bg-npb-canvas-bg p-8 min-h-0"
      onClick={() => actions?.onSelect(null)}
    >
      {isPreviewMode && previewUrl ? (
        <IframeDevicePreview
          device={deviceView}
          previewUrl={previewUrl}
          refreshKey={previewRefreshKey ?? 0}
        />
      ) : (
        <DevicePreview device={deviceView}>
          <div className="npb-canvas-page bg-npb-canvas-page text-npb-text-primary min-h-full min-w-0 shadow-lg overflow-x-clip">
            {renderEditorStack()}
          </div>
        </DevicePreview>
      )}
    </div>
  );
}
