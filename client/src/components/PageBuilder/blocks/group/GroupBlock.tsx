import React from "react";
import type { JSX } from "react";
import type { BlockConfig } from "@shared/schema-types";
import type { BlockDefinition, BlockComponentProps } from "../types.ts";
import { ContainerChildren } from "../../BlockRenderer";
import { Package as GroupIcon } from "lucide-react";
import { useBlockState } from "../useBlockState";
import { type GroupContent, DEFAULT_CONTENT } from "./group-model";
import { GroupSettings } from "./group-settings";

// ============================================================================
// RENDERER
// ============================================================================

interface GroupRendererProps {
  hostBlock: BlockConfig;
  content: GroupContent;
  styles?: React.CSSProperties;
  children?: BlockConfig[];
  isPreview?: boolean;
  onNestedBlockChange?: (updated: BlockConfig) => void;
}

function GroupRenderer({
  hostBlock,
  content,
  styles,
  children,
  isPreview,
  onNestedBlockChange,
}: GroupRendererProps) {
  const tagName = content?.tagName || 'div';
  const className = [
    'wp-block-group',
    content?.className || '',
  ].filter(Boolean).join(' ');
  const TagName = tagName as keyof JSX.IntrinsicElements;

  const display = content?.display || 'block';
  const flexDirection = content?.flexDirection || 'column';
  const flexWrap = content?.flexWrap || 'nowrap';
  const alignItems = content?.alignItems || 'flex-start';
  const justifyContent = content?.justifyContent || 'flex-start';
  const gap = content?.gap || '0px';
  const overflow = content?.overflow || 'visible';

  const containerStyle: React.CSSProperties = {
    ...styles,
    padding: styles?.padding || '1.25em 2.375em',
    ...(display === 'flex' || display === 'inline-flex' ? {
      display,
      flexDirection,
      flexWrap,
      alignItems,
      justifyContent,
      gap,
    } : {}),
    ...(display === 'grid' ? {
      display: 'grid',
      gridTemplateColumns: content?.gridTemplateColumns || 'repeat(auto-fill, minmax(200px, 1fr))',
      gridTemplateRows: content?.gridTemplateRows,
      gap,
      alignItems,
      justifyContent,
    } : {}),
    ...(display === 'block' || display === 'inline-block' || display === 'inline' ? {
      display,
    } : {}),
    overflow,
    minWidth: content?.minWidth,
    maxWidth: content?.maxWidth,
    minHeight: content?.minHeight,
    maxHeight: content?.maxHeight,
    width: content?.width || styles?.width,
    height: content?.height || styles?.height,
    boxSizing: 'border-box',
  };

  // Real block id/name so ContainerChildren registers a valid droppableId for insert/move.
  const blockForChildren: BlockConfig = {
    ...hostBlock,
    content: content as any,
    styles,
    children: children ?? hostBlock.children ?? [],
  };

  return (
    <TagName
      className={className}
      style={containerStyle}
    >
      <div className="wp-block-group__inner-container">
        <ContainerChildren
          block={blockForChildren}
          isPreview={isPreview ?? false}
          onBlockChange={onNestedBlockChange}
        />
      </div>
    </TagName>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GroupBlockComponent({
  value,
  onChange,
  onNestedBlockChange,
  isPreview,
}: BlockComponentProps) {
  const { content, styles } = useBlockState<GroupContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
  });

  return (
    <GroupRenderer
      hostBlock={value}
      content={content}
      styles={styles}
      children={value.children}
      isPreview={isPreview}
      onNestedBlockChange={onNestedBlockChange}
    />
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const GroupBlock: BlockDefinition = {
  id: 'core/group',
  label: 'Group',
  icon: GroupIcon,
  description: 'Gather blocks in a layout container',
  category: 'layout',
  isContainer: true,
  handlesOwnChildren: true,
  defaultContent: {
    tagName: 'div',
    className: '',
    display: 'block',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: '0px',
  },
  defaultStyles: {
    padding: '1.25em 2.375em',
  },
  component: GroupBlockComponent,
  settings: GroupSettings,
  hasSettings: true,
};

export default GroupBlock;
