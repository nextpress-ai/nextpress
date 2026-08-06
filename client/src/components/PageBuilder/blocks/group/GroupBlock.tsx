import React from "react";
import type { JSX } from "react";
import type { BlockConfig } from "@shared/schema-types";
import { buildGroupShellStyles, readGroupShellContent } from "@shared/group-shell-styles";
import { ContainerChildren } from "../../BlockRenderer";
import { Package as GroupIcon } from "lucide-react";
import { createBlockDefinition } from "../createBlockDefinition";
import { type GroupContent, DEFAULT_SEMANTIC_CONTENT } from "./group-model";
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
  const tagName = content?.tagName || "div";
  const className = ["wp-block-group", content?.className || ""].filter(Boolean).join(" ");
  const TagName = tagName as keyof JSX.IntrinsicElements;

  const shellContent = readGroupShellContent(content as BlockConfig["content"]);
  const childBlocks = children ?? hostBlock.children ?? [];
  const { outerStyle } = buildGroupShellStyles({
    styles,
    content: shellContent,
    children: childBlocks.map((child) => ({ styles: child.styles })),
  });

  const blockForChildren: BlockConfig = {
    ...hostBlock,
    content: content as BlockConfig["content"],
    styles,
    children: childBlocks,
  };

  return (
    <TagName className={className} style={outerStyle}>
      <ContainerChildren
        block={blockForChildren}
        isPreview={isPreview ?? false}
        stackClassName="wp-block-group__inner-container"
        onBlockChange={onNestedBlockChange}
      />
    </TagName>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const GroupBlock = createBlockDefinition<GroupContent>({
  id: "core/group",
  label: "Group",
  icon: GroupIcon,
  description: "Gather blocks in a layout container",
  category: "layout",
  isContainer: true,
  handlesOwnChildren: true,
  defaultContent: DEFAULT_SEMANTIC_CONTENT,
  defaultStyles: {
    padding: "1rem 1.25rem",
    width: "100%",
    boxSizing: "border-box",
  },
  settings: GroupSettings,
  hasSettings: true,
  render: ({ content, styles, value, isPreview, onNestedBlockChange }) => (
    <GroupRenderer
      hostBlock={value}
      content={content}
      styles={styles}
      children={value.children}
      isPreview={isPreview}
      onNestedBlockChange={onNestedBlockChange}
    />
  ),
});

export default GroupBlock;
