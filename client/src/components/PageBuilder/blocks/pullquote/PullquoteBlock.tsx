import React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { SettingsLabel } from '../../shared';
import { Quote as QuoteIcon, Settings } from "lucide-react";
import { createBlockDefinition } from "../createBlockDefinition";
import { BlockShell } from "../shared/block-shell";
import { useSettingsState } from "../useSettingsState";
import { sanitizeHtml } from "../../utils";

// ============================================================================
// TYPES
// ============================================================================

type PullquoteContent = {
  value?: string;
  citation?: string;
  textAlign?: 'left' | 'center' | 'right';
  className?: string;
};

const DEFAULT_CONTENT: PullquoteContent = {
  value: '<p>Add a quote that stands out from the rest of your content.</p>',
  citation: '',
  textAlign: 'center',
  className: '',
};

// ============================================================================
// RENDERER
// ============================================================================

interface PullquoteRendererProps {
  content: PullquoteContent;
  styles?: React.CSSProperties;
}

function PullquoteRenderer({ content, styles }: PullquoteRendererProps) {
  const value = content?.value || '';
  const citation = content?.citation || '';
  const textAlign = content?.textAlign || 'center';
  
  return (
    <BlockShell
      as="figure"
      blockClass="wp-block-pullquote"
      className={[
        textAlign ? `has-text-align-${textAlign}` : '',
        content?.className || '',
      ].filter(Boolean).join(' ') || undefined}
      style={{
        textAlign,
        margin: '2em 0',
        padding: '2em',
        borderTop: '4px solid currentColor',
        borderBottom: '4px solid currentColor',
        backgroundColor: '#f8f9fa',
        ...styles,
      }}
    >
      <blockquote
        style={{
          fontSize: '1.5em',
          lineHeight: '1.6',
          fontStyle: 'italic',
          margin: 0,
          padding: 0,
        }}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
      />
      {citation && (
        <cite
          style={{
            display: 'block',
            marginTop: '1em',
            fontSize: '0.9em',
            fontStyle: 'normal',
            opacity: 0.8,
          }}
        >
          {citation}
        </cite>
      )}
    </BlockShell>
  );
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface PullquoteSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function PullquoteSettings({ block, onUpdate }: PullquoteSettingsProps) {
  const { content, styles, updateContent, updateStyles } = useSettingsState<PullquoteContent>({
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
            <SettingsLabel htmlFor="pullquote-content">Quote Content</SettingsLabel>
            <Textarea
              id="pullquote-content"
              value={content?.value || ''}
              onChange={(e) => updateContent({ value: e.target.value })}
              placeholder="Enter your quote here..."
              rows={4}
              className="mt-1"
            />
          </div>

          <div>
            <SettingsLabel htmlFor="pullquote-citation">Citation</SettingsLabel>
            <Input
              id="pullquote-citation"
              value={content?.citation || ''}
              onChange={(e) => updateContent({ citation: e.target.value })}
              placeholder="Quote author or source"
              className="mt-1 h-9"
            />
          </div>
        </div>
      </CollapsibleCard>

      {/* Settings Card */}
      <CollapsibleCard title="Settings" icon={Settings} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <SettingsLabel htmlFor="pullquote-align">Text Align</SettingsLabel>
            <Select
              value={content?.textAlign || 'center'}
              onValueChange={(value) => updateContent({ textAlign: value as 'left' | 'center' | 'right' })}
            >
              <SelectTrigger id="pullquote-align" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <SettingsLabel htmlFor="pullquote-bg-color">Background Color</SettingsLabel>
              <div className="flex gap-3 mt-1">
                <Input
                  id="pullquote-bg-color"
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
              <SettingsLabel htmlFor="pullquote-text-color">Text Color</SettingsLabel>
              <div className="flex gap-3 mt-1">
                <Input
                  id="pullquote-text-color"
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
          </div>
        </div>
      </CollapsibleCard>
    </div>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const PullquoteBlock = createBlockDefinition<PullquoteContent>({
  id: 'core/pullquote',
  label: 'Pullquote',
  icon: QuoteIcon,
  description: 'Give special visual emphasis to a quote from your text',
  category: 'advanced',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: {
    backgroundColor: '#f8f9fa',
    color: '#000000',
  },
  settings: PullquoteSettings,
  hasSettings: true,
  render: ({ content, styles }) => <PullquoteRenderer content={content} styles={styles} />,
});

export default PullquoteBlock;
