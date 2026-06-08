import React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { Input } from "@/components/ui/input";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { SettingsLabel } from '../../shared';
import { Minus as SeparatorIcon, Settings } from "lucide-react";
import { createBlockDefinition } from "../createBlockDefinition";
import { useSettingsState } from "../useSettingsState";

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
// SETTINGS COMPONENT
// ============================================================================

interface SeparatorSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function SeparatorSettings({ block, onUpdate }: SeparatorSettingsProps) {
  const { styles, updateStyles } = useSettingsState<SeparatorContent>({
    block,
    onUpdate,
    defaultContent: DEFAULT_CONTENT,
  });

  return (
    <div className="space-y-4">
      {/* Content Card */}
      <CollapsibleCard title="Content" icon={SeparatorIcon} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <SettingsLabel htmlFor="separator-color">Color</SettingsLabel>
            <div className="flex gap-3 mt-1">
              <Input
                id="separator-color"
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
      </CollapsibleCard>

      {/* Settings Card */}
      <CollapsibleCard title="Settings" icon={Settings} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <SettingsLabel htmlFor="separator-width">Width</SettingsLabel>
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
// BLOCK DEFINITION
// ============================================================================

const SeparatorBlock = createBlockDefinition<SeparatorContent>({
  id: 'core/separator',
  label: 'Separator',
  icon: SeparatorIcon,
  description: 'Create a break between ideas or sections',
  category: 'layout',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: {
    color: '#000000',
    width: '100px',
    margin: '2.5em auto',
  },
  settings: SeparatorSettings,
  hasSettings: true,
  render: ({ content, styles }) => <SeparatorRenderer content={content} styles={styles} />,
});

export default SeparatorBlock;
