import React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { SettingsLabel } from '../../shared';
import { FileText as PreformattedIcon, Settings } from "lucide-react";
import { createBlockDefinition } from "../createBlockDefinition";
import { BlockShell } from "../shared/block-shell";
import { InlineTextEditor } from "../shared/inline-text-editor";
import { useSettingsState } from "../useSettingsState";

// ============================================================================
// TYPES
// ============================================================================

type PreformattedContent = {
  content?: string;
  className?: string;
};

const DEFAULT_CONTENT: PreformattedContent = {
  content: 'This is preformatted text.\nIt preserves    spacing   and\n\teven\ttabs!',
  className: '',
};

// ============================================================================
// RENDERER
// ============================================================================

interface PreformattedRendererProps {
  content: PreformattedContent;
  styles?: React.CSSProperties;
  isEditing?: boolean;
  onUpdateContent?: (updates: Partial<PreformattedContent>) => void;
}

function PreformattedRenderer({
  content,
  styles,
  isEditing,
  onUpdateContent,
}: PreformattedRendererProps) {
  const textContent = content?.content || '';

  const preStyle: React.CSSProperties = {
    fontFamily: 'Monaco, Consolas, "Andale Mono", "DejaVu Sans Mono", monospace',
    fontSize: '14px',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    overflow: 'auto',
    backgroundColor: '#f8f9fa',
    padding: '1em',
    border: '1px solid #e9ecef',
    borderRadius: '4px',
    margin: '1em 0',
    ...styles,
  };

  if (isEditing) {
    return (
      <BlockShell
        as="pre"
        blockClass="wp-block-preformatted"
        className={content?.className}
        style={preStyle}
      >
        <InlineTextEditor
          value={textContent}
          onChange={(value) => onUpdateContent?.({ content: value })}
          style={{
            fontFamily: preStyle.fontFamily,
            fontSize: '14px',
            lineHeight: '1.6',
            color: 'inherit',
          }}
          multiline
          minHeight={80}
          placeholder="Enter your preformatted text here..."
        />
      </BlockShell>
    );
  }

  return (
    <BlockShell
      as="pre"
      blockClass="wp-block-preformatted"
      className={content?.className}
      style={preStyle}
    >
      {textContent}
    </BlockShell>
  );
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface PreformattedSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function PreformattedSettings({ block, onUpdate }: PreformattedSettingsProps) {
  const { content, styles, updateContent, updateStyles } = useSettingsState<PreformattedContent>({
    block,
    onUpdate,
    defaultContent: DEFAULT_CONTENT,
  });

  return (
    <div className="space-y-4">
      {/* Content Card */}
      <CollapsibleCard title="Content" icon={PreformattedIcon} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <SettingsLabel htmlFor="preformatted-content">Preformatted Text</SettingsLabel>
            <Textarea
              id="preformatted-content"
              value={content?.content || ''}
              onChange={(e) => updateContent({ content: e.target.value })}
              placeholder="Enter your preformatted text here..."
              rows={8}
              className="mt-1"
              style={{
                fontFamily: 'Monaco, Consolas, "Andale Mono", "DejaVu Sans Mono", monospace',
                fontSize: '14px',
              }}
            />
            <p className="text-sm text-npb-text-muted mt-2">
              This text will preserve whitespace and line breaks exactly as you type them.
            </p>
          </div>
        </div>
      </CollapsibleCard>

      {/* Settings Card */}
      <CollapsibleCard title="Settings" icon={Settings} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <SettingsLabel htmlFor="preformatted-bg-color">Background Color</SettingsLabel>
            <div className="flex gap-3 mt-1">
              <Input
                id="preformatted-bg-color"
                type="color"
                value={styles?.backgroundColor || "#f8f9fa"}
                onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
                className="w-12 h-9 p-1 border-npb-border-default"
              />
              <Input
                value={styles?.backgroundColor || "#f8f9fa"}
                onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
                placeholder="#f8f9fa"
                className="flex-1 h-9 text-sm"
              />
            </div>
          </div>

          <div>
            <SettingsLabel htmlFor="preformatted-text-color">Text Color</SettingsLabel>
            <div className="flex gap-3 mt-1">
              <Input
                id="preformatted-text-color"
                type="color"
                value={styles?.color || "#000000"}
                onChange={(e) => updateStyles({ color: e.target.value })}
                className="w-12 h-9 p-1 border-npb-border-default"
              />
              <Input
                value={styles?.color || "#000000"}
                onChange={(e) => updateStyles({ color: e.target.value })}
                placeholder="#000000"
                className="flex-1 h-9 text-sm"
              />
            </div>
          </div>

          <div>
            <SettingsLabel htmlFor="preformatted-font-size">Font Size</SettingsLabel>
            <Input
              id="preformatted-font-size"
              value={
                styles?.fontSize !== undefined && styles.fontSize !== null
                  ? String(styles.fontSize)
                  : ""
              }
              onChange={(e) => updateStyles({ fontSize: e.target.value })}
              placeholder="14px"
              className="mt-1 h-9"
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

const PreformattedBlock = createBlockDefinition<PreformattedContent>({
  id: 'core/preformatted',
  label: 'Preformatted',
  icon: PreformattedIcon,
  description: 'Add text that respects your spacing and tabs',
  category: 'advanced',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: {
    backgroundColor: '#f8f9fa',
    color: '#000000',
    fontSize: '14px',
  },
  settings: PreformattedSettings,
  hasSettings: true,
  render: ({ content, styles, isEditing, setContent }) => (
    <PreformattedRenderer
      content={content}
      styles={styles}
      isEditing={isEditing}
      onUpdateContent={(updates) => setContent((prev) => ({ ...prev, ...updates }))}
    />
  ),
});

export default PreformattedBlock;
