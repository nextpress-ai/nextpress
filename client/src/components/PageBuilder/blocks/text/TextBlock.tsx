import React from "react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import { Textarea } from "@/components/ui/textarea";
import { SettingsLabel, SettingsSection } from '../../shared';
import { Type } from 'lucide-react';
import { createBlockDefinition } from "../createBlockDefinition";
import { BlockShell } from "../shared/block-shell";
import { InlineTextEditor } from "../shared/inline-text-editor";
import { useSettingsState } from "../useSettingsState";
import { sanitizeHtml } from "@shared/sanitize-html";
import { readTextAlign } from "@shared/text-align";
import { PARAGRAPH_DEFAULT_CONTENT } from "@shared/block-catalog/text-blocks";
import { catalogMeta } from "../catalog-meta";
import { DocsTextField } from "../../docs-mode/DocsTextField";
import { useWriting } from "../../writing/writing-context";

// ============================================================================
// TYPES
// ============================================================================

type TextBlockContent = BlockContent & {
  /** Old saves only. Alignment lives on `styles.textAlign` (shared/text-align.ts). */
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  align?: 'left' | 'center' | 'right' | 'justify';
  anchor?: string;
  className?: string;
  dropCap?: boolean;
};

const DEFAULT_CONTENT: TextBlockContent = PARAGRAPH_DEFAULT_CONTENT;

// ============================================================================
// RENDERER
// ============================================================================

interface TextRendererProps {
  content: TextBlockContent;
  styles?: React.CSSProperties;
  isEditing?: boolean;
  blockId?: string;
  onUpdateContent?: (updates: Partial<TextBlockContent>) => void;
}

function TextRenderer({
  content,
  styles,
  isEditing,
  blockId,
  onUpdateContent,
}: TextRendererProps) {
  const writing = useWriting();
  const textContent = content?.kind === "text" ? content.value : "";
  const align =
    readTextAlign({ styles, content }) ||
    (content?.align as string | undefined);
  const anchor = content?.anchor as string | undefined;
  const extraClass = (content?.className as string | undefined) || "";
  const dropCap = Boolean(content?.dropCap);

  const mergedStyles: React.CSSProperties = {
    color: "var(--npb-text-primary)",
    ...styles,
    ...(align ? { textAlign: align as React.CSSProperties["textAlign"] } : {}),
  };

  const sharedClassName =
    [
      align ? `has-text-align-${align}` : "",
      dropCap ? "has-drop-cap" : "",
      extraClass,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  // `format: "html"` carries sanitized inline markup (e.g. imported paragraphs with links/bold).
  // In an editor that writes (docs, posts) the paragraph is typed like a document: Enter, markers, "/" and **bold** work.
  if (isEditing && writing && blockId) {
    return (
      <BlockShell as="p" blockClass="wp-block-paragraph" className={sharedClassName} style={mergedStyles} id={anchor}>
        <DocsTextField
          blockId={blockId}
          value={textContent}
          format={(content as { format?: string }).format}
          kind="paragraph"
          onChange={(fields) => onUpdateContent?.(fields as Partial<TextBlockContent>)}
          placeholder="Write, or type / for a block"
          ariaLabel="Paragraph text"
        />
      </BlockShell>
    );
  }

  if (isEditing) {
    return (
      <BlockShell
        as="p"
        blockClass="wp-block-paragraph"
        className={sharedClassName}
        style={mergedStyles}
        id={anchor}
      >
        <InlineTextEditor
          value={textContent}
          onChange={(value) =>
            onUpdateContent?.({ kind: "text", value } as Partial<TextBlockContent>)
          }
          style={mergedStyles}
          multiline
          placeholder="Enter your text content"
        />
      </BlockShell>
    );
  }

  // An empty paragraph in an editor that writes still shows where it is and how to start, on the canvas only (the published page leaves it out).
  if (writing && textContent.replace(/<[^>]*>/g, "").trim() === "") {
    return (
      <BlockShell as="p" blockClass="wp-block-paragraph" className={sharedClassName} style={mergedStyles} id={anchor}>
        <span className="text-npb-text-muted">Empty paragraph. Double-click to write.</span>
      </BlockShell>
    );
  }

  if ((content as { format?: string })?.format === "html") {
    return (
      <BlockShell
        as="p"
        blockClass="wp-block-paragraph"
        className={sharedClassName}
        style={mergedStyles}
        id={anchor}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(textContent) }}
      />
    );
  }

  return (
    <BlockShell
      as="p"
      blockClass="wp-block-paragraph"
      className={sharedClassName}
      style={mergedStyles}
      id={anchor}
    >
      {textContent}
    </BlockShell>
  );
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface TextSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function TextSettings({ block, onUpdate }: TextSettingsProps) {
  const { content, updateContent } = useSettingsState<TextBlockContent>({
    block,
    onUpdate,
    defaultContent: DEFAULT_CONTENT,
  });

  return (
    <div className="space-y-4">
      <SettingsSection>
        <div className="space-y-4">
          <div>
            <SettingsLabel htmlFor="text-content">Text Content</SettingsLabel>
            <Textarea
              id="text-content"
              aria-label="Text content"
              className="h-36"
              value={content?.kind === 'text' ? content.value : ''}
              onChange={(e) => updateContent({ kind: 'text', value: e.target.value } as TextBlockContent)}
              placeholder="Enter your text content"
              rows={4}
            />
          </div>
          
        </div>
      </SettingsSection>
    </div>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const TextBlock = createBlockDefinition<TextBlockContent>({
  ...catalogMeta('core/paragraph'),
  icon: Type,
  defaultContent: DEFAULT_CONTENT,
  settings: TextSettings,
  hasSettings: true,
  render: ({ value, content, styles, isEditing, setContent }) => (
    <TextRenderer
      blockId={value.id}
      content={content}
      styles={styles}
      isEditing={isEditing}
      onUpdateContent={(updates) => setContent((prev) => ({ ...prev, ...updates }) as TextBlockContent)}
    />
  ),
});

export default TextBlock;
