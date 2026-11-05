import React, { useState } from "react";
import type { BlockConfig } from "@shared/schema-types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SettingsLabel, SettingsSection } from '../../shared';
import { SettingsChipGroup } from "../../settings-chip-group";
import { Quote as QuoteIcon } from "lucide-react";
import { createBlockDefinition } from "../createBlockDefinition";
import { BlockShell } from "../shared/block-shell";
import { InlineTextEditor } from "../shared/inline-text-editor";
import { useSettingsState } from "../useSettingsState";
import { readTextAlign } from "@shared/text-align";
import { sanitizeHtml } from "../../utils";
import { QUOTE_DEFAULT_CONTENT } from "@shared/block-catalog/text-blocks";
import { catalogMeta } from "../catalog-meta";
import { useWriting } from "../../writing/writing-context";

// ============================================================================
// TYPES
// ============================================================================

type QuoteContent = {
  value?: string;
  text?: string;
  citation?: string;
  author?: string;
  anchor?: string;
  className?: string;
  /** Old saves only. Alignment lives on `styles.textAlign` (shared/text-align.ts). */
  textAlign?: 'left' | 'center' | 'right';
  align?: 'wide' | 'full';
};

type QuoteTextAlign = NonNullable<QuoteContent['textAlign']>;

const DEFAULT_CONTENT: QuoteContent = QUOTE_DEFAULT_CONTENT;

const QUOTE_ALIGN_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

function isQuoteTextAlign(value: string): value is QuoteTextAlign {
  return value === "left" || value === "center" || value === "right";
}

/**
 * WHY: Enter must leave a blank paragraph in the saved HTML. The field is
 * derived from that HTML, so empty `<p>` / `<p><br></p>` stay as empty lines
 * instead of being stripped on the next render.
 */
function quoteParagraphToLine(inner: string): string {
  const withoutBreaks = inner.replace(/<br\s*\/?>/gi, "");
  return withoutBreaks.trim() === "" ? "" : inner;
}

function readQuotePlainText({
  value,
  fallbackText,
}: {
  value?: string;
  fallbackText?: string;
}): string {
  if (value && value.includes("<p")) {
    return value
      .split(/<\/p>/i)
      .filter((chunk) => /<p/i.test(chunk))
      .map((chunk) => quoteParagraphToLine(chunk.replace(/<p[^>]*>/i, "")))
      .join("\n");
  }
  return fallbackText || "";
}

function writeQuoteHtml(text: string): string {
  return text
    .split("\n")
    .map((line) => (line === "" ? "<p><br></p>" : `<p>${sanitizeHtml(line)}</p>`))
    .join("");
}

// ============================================================================
// RENDERER
// ============================================================================

interface QuoteRendererProps {
  content: QuoteContent;
  styles?: React.CSSProperties;
  isEditing?: boolean;
  blockId?: string;
  onUpdateContent?: (updates: Partial<QuoteContent>) => void;
}

function QuoteRenderer({
  content,
  styles,
  isEditing,
  blockId,
  onUpdateContent,
}: QuoteRendererProps) {
  // A quote made by typing "> " in a docs page or post opens focused, so the writer carries on typing.
  const writing = useWriting();
  const [caret] = useState(() => (writing && blockId ? writing.takeCaret(blockId) ?? undefined : undefined));
  const valueHtmlRaw: string | undefined = content?.value;
  const legacyText: string | undefined = content?.text;
  const citation: string | undefined = content?.citation ?? content?.author;
  const anchor: string | undefined = content?.anchor;
  const className: string | undefined = content?.className;
  const textAlign = readTextAlign({ styles, content });
  const align: 'wide' | 'full' | undefined = content?.align;

  const valueHtml = (valueHtmlRaw && valueHtmlRaw.trim().length > 0)
    ? valueHtmlRaw
    : (legacyText ? `<p>${legacyText}</p>` : '<p>Add a quote</p>');

  const plainText = readQuotePlainText({
    value: valueHtml,
    fallbackText: content?.text || "",
  });

  const editorStyle: React.CSSProperties = {
    fontStyle: 'italic',
    fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif',
    fontSize: '1.125rem',
    lineHeight: 1.7,
    color: 'inherit',
  };

  return (
    <BlockShell
      as="blockquote"
      blockClass="wp-block-quote"
      className={[
        className || '',
        textAlign ? `has-text-align-${textAlign}` : '',
        align ? `align${align}` : '',
      ]
        .filter(Boolean)
        .join(' ') || undefined}
      {...(anchor ? { id: anchor } : {})}
      style={{
        backgroundColor: '#f8fafc',
        borderLeft: '4px solid #e2e8f0',
        padding: '16px 20px',
        borderRadius: '6px',
        fontStyle: 'italic',
        fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif',
        fontSize: '1.125rem',
        lineHeight: 1.7,
        ...styles,
        ...(textAlign ? { textAlign } : {}),
      }}
    >
      {isEditing ? (
        <div className="space-y-2">
          <InlineTextEditor
            value={plainText}
            onChange={(text) => {
              onUpdateContent?.({ value: writeQuoteHtml(text), text: undefined });
            }}
            style={editorStyle}
            multiline
            focusAt={caret}
            placeholder="Add a quote"
          />
          <InlineTextEditor
            value={citation ?? ''}
            onChange={(value) => onUpdateContent?.({ citation: value })}
            style={{ fontSize: '0.95rem', color: '#64748b' }}
            placeholder="Who said this (optional)"
          />
        </div>
      ) : (
        <>
          <div style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(valueHtml) }} />
          {citation && (
            <cite style={{ display: 'block', marginTop: '10px', fontSize: '0.95rem', color: '#64748b' }}>
              — {citation}
            </cite>
          )}
        </>
      )}
    </BlockShell>
  );
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface QuoteSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function QuoteSettings({ block, onUpdate }: QuoteSettingsProps) {
  const { content, styles, updateContent, updateStyles } = useSettingsState<QuoteContent>({
    block,
    onUpdate,
    defaultContent: DEFAULT_CONTENT,
  });

  return (
    <SettingsSection>
      <div>
        <SettingsLabel htmlFor="quote-text">Quote</SettingsLabel>
        <Textarea
          id="quote-text"
          value={readQuotePlainText({
            value: content?.value,
            fallbackText: content?.text || "",
          })}
          onChange={(e) => {
            updateContent({ value: writeQuoteHtml(e.target.value) });
          }}
          placeholder={`Add your quote...`}
          rows={4}
          className="h-32"
          aria-label="Quote text"
        />
      </div>
      <div>
        <SettingsLabel htmlFor="quote-author">Citation</SettingsLabel>
        <Input
          id="quote-author"
          value={content?.citation ?? content?.author ?? ''}
          onChange={(e) => updateContent({ citation: e.target.value })}
          placeholder="Who said this (optional)"
          className="h-9"
          aria-label="Citation"
        />
      </div>
      <SettingsChipGroup
        label="Alignment"
        options={QUOTE_ALIGN_OPTIONS}
        value={readTextAlign({ styles, content }) ?? "default"}
        onChange={(value) => {
          updateStyles({
            textAlign: isQuoteTextAlign(value) ? value : null,
          } as Partial<React.CSSProperties>);
          if (content?.textAlign) updateContent({ textAlign: undefined });
        }}
      />
    </SettingsSection>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const QuoteBlock = createBlockDefinition<QuoteContent>({
  ...catalogMeta('core/quote'),
  icon: QuoteIcon,
  defaultContent: DEFAULT_CONTENT,
  settings: QuoteSettings,
  hasSettings: true,
  render: ({ value, content, styles, isEditing, setContent }) => (
    <QuoteRenderer
      blockId={value.id}
      content={content}
      styles={styles}
      isEditing={isEditing}
      onUpdateContent={(updates) => setContent((prev) => ({ ...prev, ...updates }))}
    />
  ),
});

export default QuoteBlock;
