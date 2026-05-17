import React from "react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import type { BlockDefinition, BlockComponentProps } from "../types.ts";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Minus as SeparatorIcon, Settings } from "lucide-react";
import { getBlockStateAccessor } from "../blockStateRegistry";
import { useBlockState } from "../useBlockState";

// ============================================================================
// TYPES
// ============================================================================

type SeparatorContent = {
  className?: string;
};

const DEFAULT_CONTENT: SeparatorContent = {
  className: '',
};

// ============================================================================
// RENDERER
// ============================================================================

interface SeparatorRendererProps {
  content: SeparatorContent;
  styles?: React.CSSProperties;
}

function SeparatorRenderer({ content, styles }: SeparatorRendererProps) {
  const className = [
    "wp-block-separator",
    content?.className || "",
  ].filter(Boolean).join(" ");

  return (
    <hr
      className={className}
      style={{
        ...styles,
        border: "none",
        borderTop: "1px solid currentColor",
        backgroundColor: "currentColor",
        height: "1px",
        margin: "2.5em auto",
        width: "100px",
        opacity: 1,
      }}
    />
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SeparatorBlockComponent({
  value,
  onChange,
}: BlockComponentProps) {
  const { content, styles } = useBlockState<SeparatorContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
  });

  return <SeparatorRenderer content={content} styles={styles} />;
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface SeparatorSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function SeparatorSettings({ block, onUpdate }: SeparatorSettingsProps) {
  const accessor = getBlockStateAccessor(block.id);
  const [, setUpdateTrigger] = React.useState(0);

  // Get current state
  const content = accessor
    ? (accessor.getContent() as SeparatorContent)
    : (block.content as SeparatorContent) || DEFAULT_CONTENT;
  const styles = accessor
    ? accessor.getStyles()
    : block.styles;

  // Update handlers
  const updateContent = (updates: Partial<SeparatorContent>) => {
    if (accessor) {
      const current = accessor.getContent() as SeparatorContent;
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
      <CollapsibleCard title="Content" icon={SeparatorIcon} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="separator-color" className="text-sm font-medium text-gray-700">Color</Label>
            <div className="flex gap-3 mt-1">
              <Input
                id="separator-color"
                type="color"
                value={styles?.color || "#000000"}
                onChange={(e) => updateStyles({ color: e.target.value })}
                className="w-12 h-9 p-1 border-gray-200"
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
      </CollapsibleCard>

      {/* Settings Card */}
      <CollapsibleCard title="Settings" icon={Settings} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="separator-width" className="text-sm font-medium text-gray-700">Width</Label>
            <Input
              id="separator-width"
              value={
                styles?.width !== undefined &&
                styles.width !== null &&
                String(styles.width).trim() !== ""
                  ? String(styles.width)
                  : ""
              }
              onChange={(e) => updateStyles({ width: e.target.value })}
              placeholder="e.g. 100px, 50%, auto"
              className="mt-1 h-9"
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

const SeparatorBlock: BlockDefinition = {
  id: 'core/separator',
  label: 'Separator',
  icon: SeparatorIcon,
  description: 'Create a break between ideas or sections',
  category: 'layout',
  defaultContent: {
    className: '',
  },
  defaultStyles: {
    color: '#000000',
    width: '100px',
    margin: '2.5em auto',
  },
  component: SeparatorBlockComponent,
  settings: SeparatorSettings,
  hasSettings: true,
};

export default SeparatorBlock;
