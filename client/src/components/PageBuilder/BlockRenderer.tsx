import React, { useState, isValidElement, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Trash2, GripVertical } from 'lucide-react';
import type { BlockConfig } from '@shared/schema-types';
import { blockRegistry } from './blocks';
import { Droppable, Draggable } from '@/lib/dnd';
import { useBlockActions } from './BlockActionsContext';
import { resolveTokenMap, generateBlockModifierCSS } from '@/lib/tailwind-tokens';
import { generateBlockAnimationCSS } from '@/lib/animation-presets';
import {
  stripBlockContainerPlacementStyles,
  getBlockSiblingFlexItemStyles,
  type BlockStackDirection,
} from "@shared/block-container-placement";

/** Parent stacks siblings in a row vs column — drives per-block placement flex-item mapping. */
function getSiblingStackDirection(
  parentDisplay: "flex" | "grid" | "block",
  parentDirection: "row" | "column",
): BlockStackDirection {
  if (parentDisplay === "flex" && parentDirection === "row") return "row";
  return "column";
}

/**
 * Detects the parent container's display mode from content
 */
function getParentDisplayMode(block: BlockConfig): 'flex' | 'grid' | 'block' {
  const content = block.content as Record<string, unknown> | undefined;
  const display = content?.display as string | undefined;
  if (display === 'flex' || display === 'inline-flex') return 'flex';
  if (display === 'grid') return 'grid';
  return 'block';
}

/**
 * Detects flex direction from parent content
 */
function getParentFlexDirection(block: BlockConfig): 'row' | 'column' {
  const content = block.content as Record<string, unknown> | undefined;
  const dir = content?.flexDirection as string | undefined;
  return dir === 'row' || dir === 'row-reverse' ? 'row' : 'column';
}

export function ContainerChildren({
  block,
  isPreview,
  onBlockChange,
}: {
  block: BlockConfig;
  isPreview: boolean;
  onBlockChange?: (updated: BlockConfig) => void;
}) {
  const children = Array.isArray(block.children) ? block.children : [];
  const isContainer = !!blockRegistry[block.name]?.isContainer;
  const actions = useBlockActions();
  if (!isContainer) return null;

  const parentDisplay = getParentDisplayMode(block);
  const parentDirection = getParentFlexDirection(block);
  const isHorizontal = parentDisplay === 'flex' && parentDirection === 'row';
  const dropDirection = isHorizontal ? 'horizontal' : 'vertical';
  const siblingStackDirection = getSiblingStackDirection(parentDisplay, parentDirection);

  /** When parent isn't flex/grid, emulate a vertical sibling stack so placement behaves like canvas. */
  const childOuterDisplay =
    parentDisplay === 'flex' ? 'flex' : parentDisplay === 'grid' ? 'grid' : 'flex';

  /** Flex direction for sibling list (grid omits flexDirection). */
  const siblingFlexDirection: React.CSSProperties['flexDirection'] =
    parentDisplay === 'flex' ? parentDirection : 'column';

  const stackGap =
    parentDisplay !== 'block'
      ? (block.content as any)?.gap || '16px'
      : undefined;

  /** Shared wrapper layout for Droppable + preview child lists */
  const childrenStackStyle = (): React.CSSProperties => ({
    display: childOuterDisplay,
    ...(stackGap != null ? { gap: stackGap } : {}),
    ...(childOuterDisplay === 'flex'
      ? {
          flexDirection: siblingFlexDirection,
          flexWrap: parentDisplay === 'flex' ? ((block.content as any)?.flexWrap || 'wrap') : undefined,
          alignItems: 'stretch',
        }
      : {}),
  });

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
      <div data-container-children="true" style={{ ...childrenStackStyle(), width: '100%', minWidth: 0 }}>
        {children.map((child) => (
          <div
            key={child.id}
            style={{
              minWidth: 0,
              flex:
                parentDisplay === 'flex' && parentDirection === 'row'
                  ? '1 1 auto'
                  : undefined,
              ...getBlockSiblingFlexItemStyles(child.styles, siblingStackDirection),
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
          style={{
            ...childrenStackStyle(),
            minHeight: '60px',
            minWidth: 0,
            width: '100%',
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
              <Draggable
                key={child.id}
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
            ))
          ) : (
            <div className="text-center text-gray-400 p-8">
              <small>Drag blocks here</small>
            </div>
          )}
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
    ? generateBlockAnimationCSS(block.id, block.other.animation)
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

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        if (!isPreview) {
          e.stopPropagation();
          actions?.onSelect(block.id);
        }
      }}>
      {!isPreview && (
        <>
          {/* Toolbar visible when hovered or selected */}
          {(effectiveSelected || isHovered) && (
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-1 bg-white/90 border-b border-gray-200 rounded-t backdrop-blur-sm shadow-sm p-1">
              <span className="text-xs text-gray-600 px-2">
                {blockRegistry[block.name]?.label || block.name}
              </span>
              {/* Drag handle - only show when dragHandleProps provided (canvas blocks) */}
              {dragHandleProps && (
                <Button
                  {...dragHandleProps}
                  variant="ghost"
                  size="sm"
                  aria-label="Drag to reorder block"
                  className="h-6 w-6 p-0 cursor-grab active:cursor-grabbing">
                  <GripVertical className="w-3 h-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                aria-label="Duplicate block"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                }}
                className="h-6 w-6 p-0">
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Delete block"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700">
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </>
      )}

        <div
          className={`${!isPreview ? 'cursor-pointer' : ''} transition-all duration-200`}>
          <div
            className={`block-${block.id} ${!isPreview && effectiveSelected ? 'block-ring-fade' : ''} ${!isPreview && isHovered && !effectiveSelected ? 'ring-1 ring-gray-300' : ''} relative`}
            style={{
              width: '100%',
              minWidth: 0,
              boxSizing: 'border-box',
            }}>
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
          <div style={{ width: mergedStyles?.width || '100%' }}>
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
