import React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { buildStackShellStyles } from "@shared/stack-shell-styles";
import { DEFAULT_STACK_CONTENT, type StackContent } from "@shared/stack-model";
import { ContainerChildren } from "../../BlockRenderer";
import { Layers as StackIcon } from "lucide-react";
import { createBlockDefinition } from "../createBlockDefinition";
import { StackSettings } from "./stack-settings";

// ============================================================================
// RENDERER
// ============================================================================

interface StackRendererProps {
  hostBlock: BlockConfig;
  content: StackContent;
  styles?: React.CSSProperties;
  children?: BlockConfig[];
  isPreview?: boolean;
  onNestedBlockChange?: (updated: BlockConfig) => void;
}

function StackRenderer({
  hostBlock,
  content,
  styles,
  children,
  isPreview,
  onNestedBlockChange,
}: StackRendererProps) {
  const childBlocks = children ?? hostBlock.children ?? [];
  const { outerStyle, isOverlay } = buildStackShellStyles({
    styles,
    content: content as BlockConfig["content"],
    children: childBlocks.map((child) => ({ styles: child.styles })),
  });

  const blockForChildren: BlockConfig = {
    ...hostBlock,
    content: content as BlockConfig["content"],
    styles,
    children: childBlocks,
  };

  return (
    <div className="wp-block-stack" style={outerStyle}>
      <ContainerChildren
        block={blockForChildren}
        isPreview={isPreview ?? false}
        overlay={isOverlay}
        stackClassName="wp-block-stack__inner"
        onBlockChange={onNestedBlockChange}
      />
    </div>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const StackBlock = createBlockDefinition<StackContent>({
  id: "core/stack",
  label: "Stack",
  icon: StackIcon,
  description: "Stack blocks vertically, in a row, or layered AB",
  category: "layout",
  isContainer: true,
  handlesOwnChildren: true,
  defaultContent: DEFAULT_STACK_CONTENT,
  defaultStyles: {
    width: "100%",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    flexWrap: "nowrap",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    gap: "1rem",
    padding: "0px",
    margin: "0px",
  },
  settings: StackSettings,
  hasSettings: true,
  render: ({ content, styles, value, isPreview, onNestedBlockChange }) => (
    <StackRenderer
      hostBlock={value}
      content={content}
      styles={styles}
      children={value.children}
      isPreview={isPreview}
      onNestedBlockChange={onNestedBlockChange}
    />
  ),
});

export default StackBlock;
