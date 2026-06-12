import React, { useState, useRef, useEffect, isValidElement, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Trash2, GripVertical } from 'lucide-react';
import type { BlockConfig } from '@shared/schema-types';
import { blockRegistry } from './blocks';
import { Droppable, Draggable, DropPlaceholder } from '@/lib/dnd';
import { useBlockActions } from './BlockActionsContext';
import { resolveTokenMap, generateBlockModifierCSS } from '@/lib/tailwind-tokens';
import { generateBlockAnimationCSS, getEntryAnimationAttributes } from '@/lib/animation-presets';
import {
  clearEntryAnimationPreview,
  useBlockEntryAnimationPreview,
} from '@/lib/entry-animation-preview-store';
import {
  stripBlockContainerPlacementStyles,
  getBlockSiblingFlexItemStyles,
  getBlockStackLayerWrapperStyles,
  readContainerLayoutFromBlock,
  getContainerParentDisplayMode,
  getContainerSiblingStackDirection,
  getContainerChildrenStackStyle,
  hasContainerShellSizing,
  stackNeedsVerticalPlacementRoom,
} from "@shared/block-container-placement";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  extractIconReferenceFromBlockContent,
  formatIconReferenceLabel,
} from '@/lib/icon-indexes';
import {
  NPB_BLOCK_TOOLBAR_LABEL_MAX_CHARS,
  NPB_ICON_REFERENCE_ROW_MAX_CHARS,
  truncateWithEllipsis,
} from '@/lib/truncate-with-ellipsis';

/** Mount-only cleanup wrapper (matches PageBuilder / editor pattern). */
function useMountEffect(effect: () => void | (() => void)) {
  useEffect(effect, []);
}

/** Ring fade and entry preview both use `animation`; keep preview on an inner wrapper. */
function isEntryPreviewAnimationEnd(
  event: React.AnimationEvent<HTMLElement>,
  animName: string,
): boolean {
  if (event.target !== event.currentTarget) return false;
  const ended = event.animationName;
  return ended === animName || ended.endsWith(animName);
}

/** Hover-only: entire floating toolbar hides after this idle period without pointer movement. */
const CANVAS_HOVER_TOOLBAR_IDLE_MS = 3000;

export function ContainerChildren({
  block,
  isPreview,
  onBlockChange,
  stackClassName,
}: {
  block: BlockConfig;
  isPreview: boolean;
  onBlockChange?: (updated: BlockConfig) => void;
  /** Applied to the flex/grid stack that directly wraps children (e.g. wp-block-container__inner). */
  stackClassName?: string;
}) {
  const children = Array.isArray(block.children) ? block.children : [];
  const isContainer = !!blockRegistry[block.name]?.isContainer;
  const actions = useBlockActions();
  if (!isContainer) return null;

  const layout = readContainerLayoutFromBlock({ styles: block.styles, content: block.content as Record<string, unknown> });
  const parentDisplay = getContainerParentDisplayMode(layout);
  const isHorizontal = parentDisplay === 'flex' && layout.flexDirection === 'row';
  const dropDirection = isHorizontal ? 'horizontal' : 'vertical';
  const siblingStackDirection = getContainerSiblingStackDirection(layout);
  const childrenStackStyle = getContainerChildrenStackStyle(layout, {
    shellStyles: block.styles,
    children,
  });
  const needsEmptyDropMinHeight =
    !isPreview &&
    children.length === 0 &&
    !hasContainerShellSizing(block.styles) &&
    !stackNeedsVerticalPlacementRoom(children);

  if (import.meta.env.DEBUG_BUILDER) {
    console.debug(
      'Rendering children for container block in preview mode:',
      block.id,
      'Children:',
      children,
      'Display:',
      parentDisplay,
    );
  }
  if (isPreview) {
    return (
      <div
        data-container-children="true"
        className={stackClassName}
        style={childrenStackStyle}
      >
        {children.map((child) => (
          <div
            key={child.id}
            style={{
              minWidth: 0,
              flex:
                parentDisplay === 'flex' && layout.flexDirection === 'row'
                  ? '1 1 auto'
                  : undefined,
              ...getBlockSiblingFlexItemStyles(child.styles, siblingStackDirection),
              ...getBlockStackLayerWrapperStyles(child),
            }}
          >
            <BlockRenderer
              block={child}
              isSelected={actions?.selectedBlockId === child.id}
              isPreview={true}
              onDuplicate={() => actions?.onDuplicate(child.id)}
              onDelete={() => actions?.onDelete(child.id)}
              onBlockChange={onBlockChange}
            />
          </div>
        ))}
      </div>
    );
  }
  return (
    <Droppable droppableId={block.id} direction={dropDirection as any}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          data-container-children="true"
          className={stackClassName}
          style={{
            ...childrenStackStyle,
            ...(needsEmptyDropMinHeight ? { minHeight: "60px" } : {}),
            minWidth: 0,
            width: "100%",
            border: snapshot.isDraggingOver
              ? '2px solid #3b82f6'
              : '2px dashed #e2e8f0',
            borderRadius: '4px',
            background: snapshot.isDraggingOver
              ? 'rgba(59,130,246,0.06)'
              : undefined,
            paddingBottom: children.length > 0 ? '20px' : '0px',
          }}>
          {children.length > 0 ? (
            children.map((child: BlockConfig, childIndex: number) => (
              <React.Fragment key={child.id}>
              {snapshot.placeholderIndex === childIndex && <DropPlaceholder />}
              <Draggable
                draggableId={child.id}
                index={childIndex}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    className={`relative group ${dragSnapshot.isDragging ? 'opacity-50' : ''}`}
                    style={{
                      minWidth: 0,
                      flex: isHorizontal ? '1 1 auto' : undefined,
                      ...getBlockSiblingFlexItemStyles(child.styles, siblingStackDirection),
                      ...getBlockStackLayerWrapperStyles(child),
                    }}
                  >
                    <BlockRenderer
                      block={child}
                      isSelected={actions?.selectedBlockId === child.id}
                      isPreview={false}
                      onDuplicate={() => actions?.onDuplicate(child.id)}
                      onDelete={() => actions?.onDelete(child.id)}
                      dragHandleProps={dragProvided.dragHandleProps}
                      onBlockChange={onBlockChange}
                    />
                  </div>
                )}
              </Draggable>
              </React.Fragment>
            ))
          ) : (
            <div className="text-center text-gray-400 p-8">
              <small>Drag blocks here</small>
            </div>
          )}
          {children.length > 0 && snapshot.placeholderIndex === children.length && <DropPlaceholder />}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

// Ensure consistent detection across module boundaries
ContainerChildren.displayName = 'ContainerChildren';

function containsContainerChildren(node: ReactNode): boolean {
  if (!node) return false;
  if (Array.isArray(node)) {
    return node.some(containsContainerChildren);
  }
  if (isValidElement(node)) {
    const type: any = (node as any).type;
    if (
      type === ContainerChildren ||
      type?.displayName === 'ContainerChildren' ||
      type?.name === 'ContainerChildren'
    ) {
      return true;
    }
    const { children } = (node.props || {}) as any;
    if (children == null) return false;
    return containsContainerChildren(children);
  }
  return false;
}

interface BlockRendererProps {
  block: BlockConfig;
  isSelected: boolean;
  isPreview: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  hoverHighlight?: 'padding' | 'margin' | null;
  dragHandleProps?: any;
  onBlockChange?: (updated: BlockConfig) => void;
}

/** Shared block label + actions row for editor chrome (positioning via className on the wrapper). */
function BlockEditorToolbarPanel({
  label,
  labelTooltip,
  dragHandleProps,
  onDuplicate,
  onDelete,
  className,
}: {
  label: string;
  /** Full toolbar string when `label` is JS-truncated (block name, icon ref, etc.). */
  labelTooltip?: string;
  dragHandleProps?: BlockRendererProps["dragHandleProps"];
  onDuplicate: () => void;
  onDelete: () => void;
  className?: string;
}) {
  const labelClass =
    'block min-w-0 flex-1 px-2 text-left text-xs text-npb-text-secondary';

  return (
    <TooltipProvider delayDuration={300}>
      <div className={`min-w-0 max-w-full ${className ?? ''}`}>
        {labelTooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`${labelClass} cursor-default`} title={labelTooltip}>
                {label}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs break-all">
              {labelTooltip}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className={labelClass} title={label}>
            {label}
          </span>
        )}
        {dragHandleProps && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                {...dragHandleProps}
                variant="ghost"
                size="sm"
                title="Drag to reorder block"
                aria-label="Drag to reorder block"
                className="h-6 w-6 p-0 cursor-grab active:cursor-grabbing">
                <GripVertical className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Drag to reorder block</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              title="Duplicate block"
              aria-label="Duplicate block"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="h-6 w-6 p-0">
              <Copy className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Duplicate block</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              title="Delete block"
              aria-label="Delete block"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="h-6 w-6 p-0 text-red-600 hover:text-red-700">
              <Trash2 className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Delete block</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export default function BlockRenderer({
  block,
  isSelected,
  isPreview,
  onDuplicate,
  onDelete,
  hoverHighlight = null,
  dragHandleProps,
  onBlockChange,
}: BlockRendererProps) {
  const [isHovered, setIsHovered] = useState(false);
  const actions = useBlockActions();
  const effectiveSelected = isSelected || actions?.selectedBlockId === block.id;
  const idleHideToolbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCanvasHoverToolbarIdleTimer = () => {
    if (idleHideToolbarTimerRef.current != null) {
      clearTimeout(idleHideToolbarTimerRef.current);
      idleHideToolbarTimerRef.current = null;
    }
  };

  const scheduleCanvasHoverToolbarIdleHide = () => {
    clearCanvasHoverToolbarIdleTimer();
    idleHideToolbarTimerRef.current = setTimeout(() => {
      idleHideToolbarTimerRef.current = null;
      setIsHovered(false);
    }, CANVAS_HOVER_TOOLBAR_IDLE_MS);
  };

  useMountEffect(() => () => {
    clearCanvasHoverToolbarIdleTimer();
  });

  const handleCanvasHoverEnter = () => {
    setIsHovered(true);
    scheduleCanvasHoverToolbarIdleHide();
  };

  const handleCanvasHoverLeave = () => {
    clearCanvasHoverToolbarIdleTimer();
    setIsHovered(false);
  };

  /**
   * Resets idle timer on real pointer movement only. Coalesced / no-op pointermove events
   * (movement 0) would otherwise keep resetting the timer so the hover toolbar never hides.
   */
  const handleCanvasHoverPointerMove = (e: React.PointerEvent) => {
    if (e.movementX === 0 && e.movementY === 0) return;
    setIsHovered((prev) => {
      if (!prev) return true;
      return prev;
    });
    scheduleCanvasHoverToolbarIdleHide();
  };

  const effectiveHoverHighlight = effectiveSelected
    ? (hoverHighlight ?? actions?.hoverHighlight ?? null)
    : null;

  const marginString: string = (block.styles?.margin as string) || '0px';
  const parseMargin = (value: string): [string, string, string, string] => {
    const parts = value.trim().split(/\s+/);
    if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
    if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
    if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]];
    return [parts[0], parts[1], parts[2], parts[3]];
  };
  const [mTop, mRight, mBottom, mLeft] = parseMargin(marginString);
  const paddingString: string = (block.styles?.padding as string) || '0px';
  const parsePadding = parseMargin;
  const [pTop, pRight, pBottom, pLeft] = parsePadding(paddingString);

  // Resolve tokenMap to inline styles + modifier CSS
  const tokenResolution = block.other?.tokenMap
    ? resolveTokenMap(block.other.tokenMap, block.other?.units || {})
    : null;

  // Placement meta belongs on sibling flex wrapper — strip before styling block markup
  const mergedStyles: React.CSSProperties = stripBlockContainerPlacementStyles({
    ...block.styles,
    ...(tokenResolution?.style || {}),
  });

  // Create a patched block with token-resolved styles for the component
  const patchedBlock: typeof block = {
    ...block,
    styles: mergedStyles,
  };

  // Generate modifier CSS (hover states, responsive) from token system
  const modifierCSS = tokenResolution?.modifierEntries?.length
    ? generateBlockModifierCSS(block.id, tokenResolution.modifierEntries)
    : "";

  // Generate animation CSS (hover/loop animations)
  const animationCSS = block.other?.animation
    ? generateBlockAnimationCSS(block.id, block.other.animation, {
        scopeLoopAfterEntry: isPreview && !!block.other.animation.entry,
      })
    : "";

  const entryAnimationAttributes =
    isPreview && block.other?.animation?.entry
      ? getEntryAnimationAttributes(block.other.animation.entry)
      : {};

  const entryPreview = useBlockEntryAnimationPreview(block.id);
  const entryPreviewClassName =
    !isPreview && entryPreview
      ? `animate__animated animate__${entryPreview.animName}`
      : "";

  // Combined CSS to inject
  const injectedCSS = [modifierCSS, animationCSS].filter(Boolean).join("\n");

  const renderContent = () => {
    if (import.meta.env.DEBUG_BUILDER) {
      console.debug('Rendering block:', block.name);
    }
    const def = blockRegistry[block.name];

    // New component pattern (preferred)
    if (def?.component) {
      const BlockComponent = def.component;
      return (
        <BlockComponent
          value={patchedBlock}
          onChange={(updated) => {
            onBlockChange?.(updated);
          }}
          onNestedBlockChange={onBlockChange}
          isPreview={isPreview}
          isSelected={effectiveSelected}
        />
      );
    }



    // Fallback
    return (
      <div
        style={mergedStyles}
        className="p-4 border border-dashed border-gray-300 rounded">
        <div className="text-center text-gray-400">
          {blockRegistry[block.name]?.label || block.name} block
          <br />
          <small>Not implemented yet</small>
        </div>
      </div>
    );
  };

  const def = blockRegistry[block.name];
  const isContainer = !!def?.isContainer;
  const contentEl = renderContent();
  const childrenHandledInRenderer =
    !!def?.handlesOwnChildren || containsContainerChildren(contentEl);

  /**
   * Container blocks nest other blocks inside this wrapper. Full-wrapper mouseenter/leave
   * stays “inside” while the pointer is over any descendant, so the toolbar never clears
   * when editing inner blocks. Use a top strip only for hover detection; non-containers keep
   * hover-anywhere behavior.
   */
  const useTopToolbarHoverStrip = isContainer && !isPreview;
  /** Toolbar is hover-only so it never sticks when a block stays selected without pointer motion. */
  const showBlockToolbar = isHovered;
  const baseBlockLabel = blockRegistry[block.name]?.label || block.name;
  const iconRefForToolbar =
    block.name === 'core/icon' ? extractIconReferenceFromBlockContent(block.content) : null;
  const iconRefFullLabel =
    iconRefForToolbar !== null ? formatIconReferenceLabel(iconRefForToolbar) : null;
  const fullToolbarLabel =
    iconRefFullLabel !== null ? `${baseBlockLabel} · ${iconRefFullLabel}` : baseBlockLabel;
  const toolbarLabelWithShortIconRef =
    iconRefFullLabel !== null
      ? `${baseBlockLabel} · ${truncateWithEllipsis({
          text: iconRefFullLabel,
          maxChars: NPB_ICON_REFERENCE_ROW_MAX_CHARS,
        })}`
      : baseBlockLabel;
  const blockToolbarLabel = truncateWithEllipsis({
    text: toolbarLabelWithShortIconRef,
    maxChars: NPB_BLOCK_TOOLBAR_LABEL_MAX_CHARS,
  });
  const blockToolbarLabelTooltip =
    blockToolbarLabel !== fullToolbarLabel ? fullToolbarLabel : undefined;
  const toolbarPanelClass =
    'npb-canvas-toolbar flex min-w-0 max-w-full items-center gap-1 p-1';

  return (
    <div
      className="relative group"
      {...(isPreview || useTopToolbarHoverStrip
        ? {}
        : {
            onMouseEnter: handleCanvasHoverEnter,
            onMouseLeave: handleCanvasHoverLeave,
            onPointerMove: handleCanvasHoverPointerMove,
          })}
      onClick={(e) => {
        if (!isPreview) {
          e.stopPropagation();
          clearCanvasHoverToolbarIdleTimer();
          actions?.onSelect(block.id);
          scheduleCanvasHoverToolbarIdleHide();
        }
      }}>
      {!isPreview && !useTopToolbarHoverStrip && showBlockToolbar && (
        <BlockEditorToolbarPanel
          label={blockToolbarLabel}
          labelTooltip={blockToolbarLabelTooltip}
          dragHandleProps={dragHandleProps}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          className={`absolute top-0 left-0 right-0 z-20 ${toolbarPanelClass}`}
        />
      )}
      {!isPreview && useTopToolbarHoverStrip && (
        <div
          className="absolute top-0 left-0 right-0 z-20 flex flex-col"
          onMouseEnter={handleCanvasHoverEnter}
          onMouseLeave={handleCanvasHoverLeave}
          onPointerMove={handleCanvasHoverPointerMove}>
          {showBlockToolbar ? (
            <BlockEditorToolbarPanel
              label={blockToolbarLabel}
              labelTooltip={blockToolbarLabelTooltip}
              dragHandleProps={dragHandleProps}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              className={toolbarPanelClass}
            />
          ) : (
            <div className="h-9 w-full shrink-0" aria-hidden />
          )}
        </div>
      )}

        <div
          className={`${!isPreview ? 'cursor-pointer' : ''} transition-all duration-200`}>
          <div
            data-block-id={block.id}
            className={`block-${block.id} ${!isPreview && effectiveSelected ? 'block-ring-fade' : ''} ${!isPreview && isHovered && !effectiveSelected ? 'npb-canvas-block-hover' : ''} relative`}
            style={{
              width: '100%',
              minWidth: 0,
              boxSizing: 'border-box',
            }}
            {...entryAnimationAttributes}
          >
          {!isPreview && effectiveHoverHighlight === 'padding' && (
            <>
              <div
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  top: 0,
                  height: pTop,
                  background: 'rgba(34,197,94,0.15)',
                }}
              />
              <div
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  bottom: 0,
                  height: pBottom,
                  background: 'rgba(34,197,94,0.15)',
                }}
              />
              <div
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{
                  left: 0,
                  width: pLeft,
                  background: 'rgba(34,197,94,0.15)',
                }}
              />
              <div
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{
                  right: 0,
                  width: pRight,
                  background: 'rgba(34,197,94,0.15)',
                }}
              />
            </>
          )}
          {!isPreview && effectiveHoverHighlight === 'margin' && (
            <div
              className="pointer-events-none"
              style={{
                position: 'absolute',
                top: `calc(-1 * ${mTop})`,
                left: `calc(-1 * ${mLeft})`,
                right: `calc(-1 * ${mRight})`,
                bottom: `calc(-1 * ${mBottom})`,
                outline: '2px dashed rgba(59,130,246,0.6)',
                outlineOffset: 0,
                borderRadius: '6px',
              }}
            />
          )}
          <div
            className={entryPreviewClassName || undefined}
            style={{
              width: mergedStyles?.width || '100%',
              ...(entryPreview
                ? {
                    ['--animate-duration' as string]: `${entryPreview.durationMs}ms`,
                    animationDelay:
                      entryPreview.delayMs > 0 ? `${entryPreview.delayMs}ms` : undefined,
                  }
                : {}),
            }}
            onAnimationEnd={
              entryPreview
                ? (event) => {
                    if (!isEntryPreviewAnimationEnd(event, entryPreview.animName)) return;
                    clearEntryAnimationPreview(entryPreview.token);
                  }
                : undefined
            }
          >
            {contentEl}
          </div>
        </div>
        {injectedCSS && <style dangerouslySetInnerHTML={{ __html: injectedCSS }} />}
        {isContainer && !childrenHandledInRenderer && (
          <ContainerChildren
            block={block}
            isPreview={isPreview}
            onBlockChange={onBlockChange}
          />
        )}
      </div>
    </div>
  );
}
