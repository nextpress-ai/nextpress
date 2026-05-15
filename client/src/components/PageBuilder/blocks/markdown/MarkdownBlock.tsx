import React from "react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import type { BlockDefinition, BlockComponentProps } from "../types.ts";
import { FileText as MarkdownIcon } from "lucide-react";
import { getBlockStateAccessor } from "../blockStateRegistry";
import { useBlockState } from "../useBlockState";

// Import dynamically to avoid loading huge library if not needed
// or we can import standard if it's fine. @uiw/react-md-editor is pretty large
import MDEditor from "@uiw/react-md-editor";

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
// COMPONENT RENDERER
// ============================================================================

interface MarkdownRendererProps {
  content: MarkdownContent;
  styles?: React.CSSProperties;
  isPreview?: boolean;
  onChange?: (value: string) => void;
}

function MarkdownRenderer({ content, styles, isPreview, onChange }: MarkdownRendererProps) {
  const markdownText = content?.content || "";

  const className = ["wp-block-markdown", content?.className || ""].filter(Boolean).join(" ");

  // In preview mode or rendering mode, display the actual markdown
  if (isPreview) {
    return (
      <div className={className} style={styles} data-color-mode="light">
        <MDEditor.Markdown source={markdownText} style={{ whiteSpace: "pre-wrap" }} />
      </div>
    );
  }

  // Edit Mode: show embeddable markdown editor
  return (
    <div className={className} style={styles} data-color-mode="light">
      <div className="overflow-hidden rounded-md border border-transparent transition-colors hover:border-gray-200 focus-within:border-wp-blue">
        <MDEditor
          value={markdownText}
          onChange={(val) => onChange?.(val || "")}
          preview="live"
          height={400}
          hideToolbar={false}
          visiableDragbar={true}
        />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MarkdownBlockComponent({
  value,
  onChange,
  isPreview,
}: BlockComponentProps) {
  const { content, styles } = useBlockState<MarkdownContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
  });

  const handleEditorChange = (newVal: string) => {
    const accessor = getBlockStateAccessor(value.id);
    if (accessor) {
      accessor.setContent({ ...(content as MarkdownContent), content: newVal });
    } else {
      onChange({
        ...value,
        content: {
          ...(value.content as Record<string, unknown>),
          content: newVal,
        } as unknown as BlockContent,
      });
    }
  };

  return (
    <MarkdownRenderer
      content={content}
      styles={styles}
      isPreview={isPreview}
      onChange={handleEditorChange}
    />
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const MarkdownBlock: BlockDefinition = {
  id: "core/markdown",
  label: "Markdown",
  icon: MarkdownIcon,
  description: "Add rich text using Markdown format",
  category: "advanced",
  defaultContent: {
    content: "### Welcome to Markdown!\n\nThis is a *markdown* block.",
    className: "",
  },
  defaultStyles: {
    margin: "1em 0",
  },
  component: MarkdownBlockComponent,
  hasSettings: false,
};

export default MarkdownBlock;
