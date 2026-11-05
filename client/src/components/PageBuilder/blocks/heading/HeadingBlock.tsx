// blocks/heading/HeadingBlock.tsx
import { Heading1 } from "lucide-react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import { Input } from "@/components/ui/input";
import { OptionButton, OptionGroup, SettingsLabel, SettingsSection } from '../../shared';
import * as React from "react";
import type { JSX } from "react";
import { createBlockDefinition } from "../createBlockDefinition";
import { BlockShell } from "../shared/block-shell";
import { InlineTextEditor } from "../shared/inline-text-editor";
import { useSettingsState } from "../useSettingsState";
import { sanitizeHtml } from "@shared/sanitize-html";
import { readTextAlign } from "@shared/text-align";
import { headingAnchorId } from "@shared/page-headings";
import { HEADING_DEFAULT_CONTENT } from "@shared/block-catalog/text-blocks";
import { catalogMeta } from "../catalog-meta";
import { DocsTextField } from "../../docs-mode/DocsTextField";
import { useWriting } from "../../writing/writing-context";

// ============================================================================
// TYPES
// ============================================================================

type HeadingContent = BlockContent & {
  level?: number;
  anchor?: string;
  className?: string;
  /** Old saves only. Alignment lives on `styles.textAlign` (shared/text-align.ts). */
  textAlign?: "left" | "center" | "right" | "justify";
};

// ============================================================================
// CONSTANTS & DATA
// ============================================================================

const DEFAULT_CONTENT: HeadingContent = HEADING_DEFAULT_CONTENT;

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get text content from heading content safely
 */
function getTextContent(content: HeadingContent): string {
  return content?.kind === "text" ? content.value : "";
}

// ============================================================================
// RENDERER
// ============================================================================

interface HeadingRendererProps {
  content: HeadingContent;
  styles?: React.CSSProperties;
  isEditing?: boolean;
  blockId?: string;
  onUpdateContent?: (updates: Partial<HeadingContent>) => void;
}

function HeadingRenderer({
  content,
  styles,
  isEditing,
  blockId,
  onUpdateContent,
}: HeadingRendererProps) {
  const writing = useWriting();
  const textContent = getTextContent(content);
  const level = content.level || 2;
  const headingId = headingAnchorId({ text: textContent, anchor: content.anchor }) || undefined;
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  const textAlign = readTextAlign({ styles, content });
  const mergedStyles: React.CSSProperties = {
    color: "var(--npb-text-primary)",
    ...styles,
    ...(textAlign ? { textAlign } : {}),
  };

  const sharedClassName =
    [
      textAlign ? `has-text-align-${textAlign}` : "",
      content.className,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  // In an editor that writes (docs, posts) the heading is typed in place; Enter starts a paragraph under it.
  if (isEditing && writing && blockId) {
    return (
      <BlockShell as={Tag} blockClass="wp-block-heading" className={sharedClassName} style={mergedStyles} id={headingId}>
        <DocsTextField
          blockId={blockId}
          value={textContent}
          format={(content as { format?: string }).format}
          kind="heading"
          onChange={(fields) => onUpdateContent?.(fields as Partial<HeadingContent>)}
          placeholder="Heading text"
          ariaLabel="Heading text"
        />
      </BlockShell>
    );
  }

  if (writing && textContent.replace(/<[^>]*>/g, "").trim() === "") {
    return (
      <BlockShell as={Tag} blockClass="wp-block-heading" className={sharedClassName} style={mergedStyles} id={headingId}>
        <span className="text-npb-text-muted">Empty heading. Double-click to write.</span>
      </BlockShell>
    );
  }

  // `format: "html"` carries sanitized inline markup (e.g. imported headings with links).
  if ((content as { format?: string })?.format === "html") {
    return (
      <BlockShell
        as={Tag}
        blockClass="wp-block-heading"
        className={sharedClassName}
        style={mergedStyles}
        id={headingId}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(textContent) }}
      />
    );
  }

  if (isEditing) {
    return (
      <BlockShell
        as={Tag}
        blockClass="wp-block-heading"
        className={sharedClassName}
        style={mergedStyles}
        id={headingId}
      >
        <InlineTextEditor
          value={textContent}
          onChange={(value) => onUpdateContent?.({ kind: "text", value })}
          style={mergedStyles}
          placeholder="Enter heading text"
          growToWrap
        />
      </BlockShell>
    );
  }

  return (
    <BlockShell
      as={Tag}
      blockClass="wp-block-heading"
      className={sharedClassName}
      style={mergedStyles}
      id={headingId}
    >
      {textContent}
    </BlockShell>
  );
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface HeadingSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function LegacyHeadingSettings({ block, onUpdate }: HeadingSettingsProps) {
  const { content, updateContent } = useSettingsState<HeadingContent>({
    block,
    onUpdate,
    defaultContent: DEFAULT_CONTENT,
  });

  const textValue = content?.kind === "text" ? content.value : "";
  const currentLevel = content?.level || 2;

  return (
    <SettingsSection>
      <OptionGroup label="Heading Level">
        {HEADING_LEVELS.map((level) => (
          <OptionButton
            key={level}
            isActive={currentLevel === level}
            onClick={() => {
              updateContent({ level });
            }}
            ariaLabel={`Heading level ${level}`}
          >
            H{level}
          </OptionButton>
        ))}
      </OptionGroup>
      <div>
        <SettingsLabel htmlFor="heading-text">Heading Text</SettingsLabel>
        <Input
          id="heading-text"
          aria-label="Heading text"
          value={textValue}
          onChange={(e) =>
            updateContent({ kind: "text", value: e.target.value })
          }
          placeholder="Enter heading text"
          className="mt-1 h-9"
        />
      </div>
    </SettingsSection>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

export const HeadingBlock = createBlockDefinition<HeadingContent>({
  ...catalogMeta("core/heading"),
  icon: Heading1,
  defaultContent: DEFAULT_CONTENT,
  settings: LegacyHeadingSettings,
  hasSettings: true,
  render: ({ value, content, styles, isEditing, setContent }) => (
    <HeadingRenderer
      blockId={value.id}
      content={content}
      styles={styles}
      isEditing={isEditing}
      onUpdateContent={(updates) => setContent((prev) => ({ ...prev, ...updates }) as HeadingContent)}
    />
  ),
});

export default HeadingBlock;
