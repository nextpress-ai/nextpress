import React from "react";
import type { JSX } from "react";
import { FileText as MarkdownIcon } from "lucide-react";
import MDEditor from "@uiw/react-md-editor";
import { createBlockDefinition } from "../createBlockDefinition";
import { BlockShell } from "../shared/block-shell";

// ============================================================================
// TYPES
// ============================================================================

export type MarkdownContent = {
  content?: string;
  className?: string;
};

const DEFAULT_CONTENT: MarkdownContent = {
  content: "### Welcome to Markdown!\n\nThis is a *markdown* block.",
  className: "",
};

// ============================================================================
// RENDERER
// ============================================================================

interface MarkdownRendererProps {
  content: MarkdownContent;
  styles?: React.CSSProperties;
  isPreview?: boolean;
  onChange?: (value: string) => void;
}

function MarkdownRenderer({
  content,
  styles,
  isPreview,
  onChange,
}: MarkdownRendererProps): JSX.Element {
  const markdownText = content?.content || "";

  if (isPreview) {
    return (
      <BlockShell blockClass="wp-block-markdown" className={content?.className} style={styles} data-color-mode="light">
        <MDEditor.Markdown source={markdownText} style={{ whiteSpace: "pre-wrap" }} />
      </BlockShell>
    );
  }

  return (
    <BlockShell blockClass="wp-block-markdown" className={content?.className} style={styles} data-color-mode="light">
      <div className="overflow-hidden rounded-md border border-npb-border-default bg-npb-surface-base transition-colors hover:border-npb-border-strong focus-within:ring-2 focus-within:ring-npb-focus focus-within:ring-offset-1">
        <MDEditor
          value={markdownText}
          onChange={(val) => onChange?.(val || "")}
          preview="live"
          height={400}
          hideToolbar={false}
          visiableDragbar={true}
        />
      </div>
    </BlockShell>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const MarkdownBlock = createBlockDefinition<MarkdownContent>({
  id: "core/markdown",
  label: "Markdown",
  icon: MarkdownIcon,
  description: "Add rich text using Markdown format",
  category: "advanced",
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: {
    margin: "1em 0",
  },
  hasSettings: false,
  render: ({ content, styles, setContent, isPreview }) => (
    <MarkdownRenderer
      content={content}
      styles={styles}
      isPreview={isPreview}
      onChange={(val) => setContent({ ...content, content: val })}
    />
  ),
});

export default MarkdownBlock;
