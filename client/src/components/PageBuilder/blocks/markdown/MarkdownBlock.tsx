import React, { useMemo } from "react";
import type { JSX } from "react";
import { FileText as MarkdownIcon } from "lucide-react";
import MDEditor from "@uiw/react-md-editor";
import type { BlockConfig } from "@shared/schema-types";
import { DOC_COMPONENT_PROPS, MarkdownView, parseMarkdown } from "@shared/markdown";
import { useTheme } from "@/components/ThemeProvider";
import { createBlockDefinition } from "../createBlockDefinition";
import { BlockShell } from "../shared/block-shell";
import { MARKDOWN_DEFAULT_CONTENT } from "@shared/block-catalog/text-blocks";
import { catalogMeta } from "../catalog-meta";

// ============================================================================
// TYPES
// ============================================================================

export type MarkdownContent = {
  content?: string;
  /** Read the text as MDX, so docs components like `<Callout>` work. */
  mdx?: boolean;
  className?: string;
};

const DEFAULT_CONTENT: MarkdownContent = MARKDOWN_DEFAULT_CONTENT;

const MIN_EDITOR_HEIGHT_PX = 160;
const LINE_HEIGHT_PX = 28;
const TOOLBAR_HEIGHT_PX = 48;
const FALLBACK_MAX_HEIGHT_PX = 560;

function readEditorColorMode(isDark: boolean | undefined): "light" | "dark" {
  return isDark === true ? "dark" : "light";
}

/**
 * Grow with line count, stay at least 160px, cap at 70vh (560px when viewport height is unknown).
 */
function getMarkdownEditorHeight(markdownText: string): number {
  const lineCount = Math.max(1, markdownText.split("\n").length);
  const contentHeight = lineCount * LINE_HEIGHT_PX + TOOLBAR_HEIGHT_PX;
  const viewportHeight = typeof window === "undefined" ? 0 : window.innerHeight;
  const maxHeight =
    viewportHeight > 0 ? Math.round(viewportHeight * 0.7) : FALLBACK_MAX_HEIGHT_PX;
  return Math.max(MIN_EDITOR_HEIGHT_PX, Math.min(maxHeight, contentHeight));
}

/** Why MDX text can't be read, in plain words with its line, or null when it reads fine (or MDX is off). */
function useMdxProblem({ text, mdx }: { text: string; mdx: boolean }): string | null {
  return useMemo(() => {
    if (!mdx) return null;
    const parsed = parseMarkdown({ text, mdx: true, components: DOC_COMPONENT_PROPS });
    if (parsed.ok) return null;
    const where = parsed.line ? `Line ${parsed.line}: ` : "";
    return `${where}${parsed.message}. Until it's fixed, the page shows this text as plain markdown.`;
  }, [text, mdx]);
}

// ============================================================================
// RENDERER
// ============================================================================

interface MarkdownRendererProps {
  blockId: string;
  content: MarkdownContent;
  styles?: React.CSSProperties;
  isPreview?: boolean;
  onChange?: (value: string) => void;
}

function MarkdownRenderer({
  blockId,
  content,
  styles,
  isPreview,
  onChange,
}: MarkdownRendererProps): JSX.Element {
  const markdownText = content?.content || "";
  const mdx = content?.mdx === true;
  const theme = useTheme();
  const colorMode = readEditorColorMode(theme?.isDark);
  const mdxProblem = useMdxProblem({ text: markdownText, mdx });

  if (isPreview) {
    return (
      <BlockShell blockClass="wp-block-markdown" className={content?.className} style={styles}>
        <MarkdownView text={markdownText} mdx={mdx} idPrefix={blockId} />
      </BlockShell>
    );
  }

  return (
    <BlockShell blockClass="wp-block-markdown" className={content?.className} style={styles} data-color-mode={colorMode}>
      <div className="min-h-[160px] max-h-[70vh] overflow-y-auto rounded-md border border-npb-border-default bg-npb-surface-base transition-colors hover:border-npb-border-strong focus-within:ring-2 focus-within:ring-npb-focus focus-within:ring-offset-1">
        <MDEditor
          value={markdownText}
          onChange={(val) => onChange?.(val || "")}
          preview="live"
          height={getMarkdownEditorHeight(markdownText)}
          hideToolbar={false}
          visibleDragbar={true}
          components={{ preview: (source) => <MarkdownView text={source} mdx={mdx} idPrefix={blockId} className="px-4 py-3" /> }}
        />
      </div>
      {mdxProblem ? (
        <p role="status" className="mt-2 text-xs text-npb-status-error">
          {mdxProblem}
        </p>
      ) : null}
    </BlockShell>
  );
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface MarkdownSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function MarkdownSettings(_props: MarkdownSettingsProps): JSX.Element {
  return (
    <div className="space-y-4">
      <p className="text-xs text-npb-text-muted">Write headings, lists, tables, code and diagrams in Markdown.</p>
    </div>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const MarkdownBlock = createBlockDefinition<MarkdownContent>({
  ...catalogMeta("core/markdown"),
  icon: MarkdownIcon,
  defaultContent: DEFAULT_CONTENT,
  settings: MarkdownSettings,
  hasSettings: true,
  render: ({ value, content, styles, setContent, isPreview }) => (
    <MarkdownRenderer
      blockId={value.id}
      content={content}
      styles={styles}
      isPreview={isPreview}
      onChange={(val) => setContent({ ...content, content: val })}
    />
  ),
});

export default MarkdownBlock;
