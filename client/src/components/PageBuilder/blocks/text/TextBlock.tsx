import React from "react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import type { BlockDefinition, BlockComponentProps } from "../types.ts";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { SettingsLabel } from '../../shared';
import { Type } from "lucide-react";
import { getBlockStateAccessor } from "../blockStateRegistry";
import { useBlockState } from "../useBlockState";

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
}

function TextRenderer({ content, styles }: TextRendererProps) {
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

  const className = [
    "wp-block-paragraph",
    align ? `has-text-align-${align}` : "",
    dropCap ? "has-drop-cap" : "",
    extraClass,
  ]
    .filter(Boolean)
    .join(" ");

  const mergedStyles: React.CSSProperties = {
    ...styles,
    ...(align ? { textAlign: align as React.CSSProperties["textAlign"] } : {}),
  };

  return (
    <p id={anchor} className={className} style={mergedStyles}>
      {textContent}
    </p>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TextBlockComponent({
  value,
  onChange,
}: BlockComponentProps) {
  const { content, setContent, styles } = useBlockState<TextBlockContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
  });

  return <TextRenderer content={content} styles={styles} />;
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface TextSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function TextSettings({ block, onUpdate }: TextSettingsProps) {
  const accessor = getBlockStateAccessor(block.id);
  const [, setUpdateTrigger] = React.useState(0);

  // Get current state
  const content = accessor
    ? (accessor.getContent() as TextBlockContent)
    : (block.content as TextBlockContent) || DEFAULT_CONTENT;

  // Update handlers
  const updateContent = (updates: Partial<TextBlockContent>) => {
    if (accessor) {
      const current = accessor.getContent() as TextBlockContent;
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
// LEGACY RENDERER (Backward Compatibility)
// ============================================================================

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const TextBlock: BlockDefinition = {
  id: 'core/paragraph',
  label: 'Paragraph',
  icon: Type,
  description: 'Add a paragraph of text',
  category: 'basic',
  defaultContent: {
    kind: 'text',
    value: 'Add your text content here. You can edit this text and customize its appearance.',
    textAlign: 'left',
    dropCap: false,
    anchor: '',
    className: '',
  },
  defaultStyles: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#333333',
  },
  component: TextBlockComponent,
  settings: TextSettings,
  hasSettings: true,
};

export default TextBlock;
