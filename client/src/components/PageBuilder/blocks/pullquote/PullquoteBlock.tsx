import React from "react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import type { BlockDefinition, BlockComponentProps } from "../types.ts";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { SettingsLabel } from '../../shared';
import { Quote as QuoteIcon, Settings } from "lucide-react";
import { getBlockStateAccessor } from "../blockStateRegistry";
import { useBlockState } from "../useBlockState";
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
  
  const className = [
    "wp-block-pullquote",
    textAlign ? `has-text-align-${textAlign}` : '',
    content?.className || "",
  ].filter(Boolean).join(" ");

  return (
    <figure
      className={className}
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
    </figure>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PullquoteBlockComponent({
  value,
  onChange,
}: BlockComponentProps) {
  const { content, styles } = useBlockState<PullquoteContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
  });

  return <PullquoteRenderer content={content} styles={styles} />;
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface PullquoteSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function PullquoteSettings({ block, onUpdate }: PullquoteSettingsProps) {
  const accessor = getBlockStateAccessor(block.id);
  const [, setUpdateTrigger] = React.useState(0);

  // Get current state
  const content = accessor
    ? (accessor.getContent() as PullquoteContent)
    : (block.content as PullquoteContent) || DEFAULT_CONTENT;
  const styles = accessor
    ? accessor.getStyles()
    : block.styles;

  // Update handlers
  const updateContent = (updates: Partial<PullquoteContent>) => {
    if (accessor) {
      const current = accessor.getContent() as PullquoteContent;
      accessor.setContent({ ...current, ...updates });
      setUpdateTrigger((prev) => prev + 1);
    } else if (onUpdate) {
      onUpdate({
        content: {
          ...block.content,
          ...updates,
        } as BlockContent,
      });
    }
  };

  const updateStyles = (styleUpdates: Partial<React.CSSProperties>) => {
    if (accessor) {
      const current = accessor.getStyles() || {};
      accessor.setStyles({ ...current, ...styleUpdates });
      setUpdateTrigger((prev) => prev + 1);
    } else if (onUpdate) {
      onUpdate({
        styles: {
          ...block.styles,
          ...styleUpdates,
        },
      });
    }
  };

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

const PullquoteBlock: BlockDefinition = {
  id: 'core/pullquote',
  label: 'Pullquote',
  icon: QuoteIcon,
  description: 'Give special visual emphasis to a quote from your text',
  category: 'advanced',
  defaultContent: {
    value: '<p>Add a quote that stands out from the rest of your content.</p>',
    citation: '',
    textAlign: 'center',
    className: '',
  },
  defaultStyles: {
    backgroundColor: '#f8f9fa',
    color: '#000000',
  },
  component: PullquoteBlockComponent,
  settings: PullquoteSettings,
  hasSettings: true,
};

export default PullquoteBlock;
