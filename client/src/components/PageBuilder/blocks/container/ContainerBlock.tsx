import React from "react";
import type { JSX } from "react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import { ContainerChildren } from "../../BlockRenderer";
import { getContainerOuterShellStyle } from "@shared/block-container-placement";
import { Box } from "lucide-react";
import { createBlockDefinition } from "../createBlockDefinition";
import { type ContainerContent, DEFAULT_CONTENT } from "./container-model";
import { ContainerSettings } from "./container-settings";

// ============================================================================
// RENDERER
// ============================================================================

interface ContainerRendererProps {
  host: BlockConfig;
  content: ContainerContent;
  styles?: React.CSSProperties;
  children?: BlockConfig[];
  isPreview?: boolean;
  onNestedBlockChange?: (updated: BlockConfig) => void;
}

/** Wraps nested blocks with Box-like spacing and background controls from styles. */
function ContainerRenderer({
  host,
  content,
  styles,
  children,
  isPreview,
  onNestedBlockChange,
}: ContainerRendererProps) {
  const tagName = content?.tagName || "div";
  const className = ["wp-block-container", content?.className || ""].filter(Boolean).join(" ");
  const TagName = tagName as keyof JSX.IntrinsicElements;

  const containerStyle = getContainerOuterShellStyle(styles, {
    children: children ?? host.children ?? [],
  });

  const blockForChildren: BlockConfig = {
    ...host,
    content: content as unknown as BlockContent,
    styles,
    children: children ?? host.children ?? [],
  };

  return (
    <TagName className={className} style={containerStyle}>
      <ContainerChildren
        block={blockForChildren}
        isPreview={isPreview ?? false}
        stackClassName="wp-block-container__inner"
        onBlockChange={onNestedBlockChange}
      />
    </TagName>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const ContainerBlock = createBlockDefinition<ContainerContent>({
  id: "core/container",
  label: "Container",
  icon: Box,
  description: "Wrap blocks in a box with background, padding, and max width",
  category: "layout",
  isContainer: true,
  handlesOwnChildren: true,
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: {
    padding: "24px",
    maxWidth: "1200px",
    marginLeft: "auto",
    marginRight: "auto",
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
  },
  settings: ContainerSettings,
  hasSettings: true,
  render: ({ content, styles, value, isPreview, onNestedBlockChange }) => (
    <ContainerRenderer
      host={value}
      content={content}
      styles={styles}
      children={value.children}
      isPreview={isPreview}
      onNestedBlockChange={onNestedBlockChange}
    />
  ),
});

export default ContainerBlock;
