import React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { SettingsLabel } from '../../shared';
import { Quote as QuoteIcon, Settings } from "lucide-react";
import { createBlockDefinition } from "../createBlockDefinition";
import { BlockShell } from "../shared/block-shell";
import { InlineTextEditor } from "../shared/inline-text-editor";
import { useSettingsState } from "../useSettingsState";
import { sanitizeHtml } from "../../utils";

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
  textAlign?: 'left' | 'center' | 'right';
  align?: 'wide' | 'full';
};

const DEFAULT_CONTENT: QuoteContent = {
  value: '<p>Add a quote</p>',
  citation: '',
  textAlign: undefined,
  align: undefined,
  anchor: '',
  className: '',
};

// ============================================================================
// RENDERER
// ============================================================================

interface QuoteRendererProps {
  content: QuoteContent;
  styles?: React.CSSProperties;
  isEditing?: boolean;
  onUpdateContent?: (updates: Partial<QuoteContent>) => void;
}

function QuoteRenderer({
  content,
  styles,
  isEditing,
  onUpdateContent,
}: QuoteRendererProps) {
  const valueHtmlRaw: string | undefined = content?.value;
  const legacyText: string | undefined = content?.text;
  const citation: string | undefined = content?.citation ?? content?.author;
  const anchor: string | undefined = content?.anchor;
  const className: string | undefined = content?.className;
  const textAlign: 'left' | 'center' | 'right' | undefined = content?.textAlign;
  const align: 'wide' | 'full' | undefined = content?.align;

  const valueHtml = (valueHtmlRaw && valueHtmlRaw.trim().length > 0)
    ? valueHtmlRaw
    : (legacyText ? `<p>${legacyText}</p>` : '<p>Add a quote</p>');

  const plainText = (() => {
    const v: string | undefined = valueHtml;
    if (v && v.includes('<p')) {
      return v
        .split(/<\/p>/i)
        .map((chunk) => chunk.replace(/<p[^>]*>/i, ''))
        .filter((line) => line !== '')
        .join('\n');
    }
    return content?.text || '';
  })();

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
      }}
    >
      {isEditing ? (
        <div className="space-y-2">
          <InlineTextEditor
            value={plainText}
            onChange={(text) => {
              const lines = text.split('\n');
              const html = lines.map((l) => `<p>${sanitizeHtml(l)}</p>`).join('');
              onUpdateContent?.({ value: html, text: undefined });
            }}
            style={editorStyle}
            multiline
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
  const { content, updateContent } = useSettingsState<QuoteContent>({
    block,
    onUpdate,
    defaultContent: DEFAULT_CONTENT,
  });

  return (
    <div className="space-y-4">
      {/* Content Card */}
      <CollapsibleCard title="Content" icon={QuoteIcon} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <SettingsLabel htmlFor="quote-text">Quote</SettingsLabel>
            <Textarea
              id="quote-text"
              value={(() => {
                const v: string | undefined = content?.value;
                if (v && v.includes('<p')) {
                  // Convert HTML paragraphs to newline-separated text for editing UX
                  return v
                    .split(/<\/p>/i)
                    .map((chunk) => chunk.replace(/<p[^>]*>/i, ''))
                    .filter((line) => line !== '')
                    .join('\n');
                }
                return content?.text || '';
              })()}
              onChange={(e) => {
                const lines = e.target.value.split('\n');
                const html = lines.map((l) => `<p>${sanitizeHtml(l)}</p>`).join('');
                updateContent({ value: html });
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
        </div>
      </CollapsibleCard>

      {/* Settings Card */}
      <CollapsibleCard title="Settings" icon={Settings} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <SettingsLabel htmlFor="quote-text-align">Text Align</SettingsLabel>
            <Select
              value={content?.textAlign ?? 'default'}
              onValueChange={(value) => updateContent({ textAlign: value === 'default' ? undefined : (value as 'left' | 'center' | 'right') })}
            >
              <SelectTrigger id="quote-text-align" className="h-9 mt-1">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <SettingsLabel htmlFor="quote-align">Width</SettingsLabel>
            <Select
              value={content?.align ?? 'default'}
              onValueChange={(value) => updateContent({ align: value === 'default' ? undefined : (value as 'wide' | 'full') })}
            >
              <SelectTrigger id="quote-align" className="h-9">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="wide">Wide</SelectItem>
                <SelectItem value="full">Full</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleCard>
    </div>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const QuoteBlock = createBlockDefinition<QuoteContent>({
  id: 'core/quote',
  label: 'Quote',
  icon: QuoteIcon,
  description: 'Add a blockquote',
  category: 'advanced',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: { margin: '1em 0' },
  settings: QuoteSettings,
  hasSettings: true,
  render: ({ content, styles, isEditing, setContent }) => (
    <QuoteRenderer
      content={content}
      styles={styles}
      isEditing={isEditing}
      onUpdateContent={(updates) => setContent((prev) => ({ ...prev, ...updates }))}
    />
  ),
});

export default QuoteBlock;
