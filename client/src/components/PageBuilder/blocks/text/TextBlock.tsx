import React from "react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { SettingsLabel } from '../../shared';
import { Type } from "lucide-react";
import { createBlockDefinition } from "../createBlockDefinition";
import { BlockShell } from "../shared/block-shell";
import { InlineTextEditor } from "../shared/inline-text-editor";
import { useSettingsState } from "../useSettingsState";
import { sanitizeHtml } from "@shared/sanitize-html";

// ============================================================================
// TYPES
// ============================================================================

type TextBlockContent = BlockContent & {
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  align?: 'left' | 'center' | 'right' | 'justify';
  anchor?: string;
  className?: string;
  dropCap?: boolean;
};

const DEFAULT_CONTENT: TextBlockContent = {
  kind: 'text',
  value: 'Add your text content here. You can edit this text and customize its appearance.',
  textAlign: 'left',
  dropCap: false,
  anchor: '',
  className: '',
};

// ============================================================================
// RENDERER
// ============================================================================

interface TextRendererProps {
  content: TextBlockContent;
  styles?: React.CSSProperties;
  isEditing?: boolean;
  onUpdateContent?: (updates: Partial<TextBlockContent>) => void;
}

function TextRenderer({
  content,
  styles,
  isEditing,
  onUpdateContent,
}: TextRendererProps) {
  const textContent = content?.kind === "text" ? content.value : "";
  // Prefer block-level style controls from the sidebar.
  // `content.textAlign` exists for legacy/compat, but it should not override user styles.
  const align =
    (styles?.textAlign as string | undefined) ||
    (content?.textAlign as string) ||
    (content?.align as string);
  const anchor = content?.anchor as string | undefined;
  const extraClass = (content?.className as string | undefined) || "";
  const dropCap = Boolean(content?.dropCap);

  const mergedStyles: React.CSSProperties = {
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
  if ((content as { format?: string })?.format === "html") {
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
      <CollapsibleCard
        title="Content"
        icon={Type}
        defaultOpen={true}
      >
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
          
          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="paragraph-dropcap">Drop cap</SettingsLabel>
            <Switch
              id="paragraph-dropcap"
              checked={Boolean(content?.dropCap)}
              onCheckedChange={(checked) => updateContent({ dropCap: checked })}
            />
          </div>
        </div>
      </CollapsibleCard>
    </div>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const TextBlock = createBlockDefinition<TextBlockContent>({
  id: 'core/paragraph',
  label: 'Paragraph',
  icon: Type,
  description: 'Add a paragraph of text',
  category: 'basic',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#333333',
  },
  settings: TextSettings,
  hasSettings: true,
  render: ({ content, styles, isEditing, setContent }) => (
    <TextRenderer
      content={content}
      styles={styles}
      isEditing={isEditing}
      onUpdateContent={(updates) => setContent((prev) => ({ ...prev, ...updates }) as TextBlockContent)}
    />
  ),
});

export default TextBlock;
