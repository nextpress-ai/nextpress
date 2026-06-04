import React from "react";
import type { BlockConfig } from "@shared/schema-types";
import type { BlockDefinition, BlockComponentProps } from "../types.ts";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { SettingsLabel } from '../../shared';
import { Space as SpaceIcon, Settings } from "lucide-react";
import { useBlockState } from "../useBlockState";
import { useSettingsState } from "../useSettingsState";

// ============================================================================
// TYPES
// ============================================================================

type SpacerContent = {
  height?: number;
  anchor?: string;
  className?: string;
};

const DEFAULT_CONTENT: SpacerContent = {
  height: 100,
  anchor: "",
  className: "",
};

// ============================================================================
// RENDERER
// ============================================================================

interface SpacerRendererProps {
  content: SpacerContent;
  styles?: React.CSSProperties;
}

function SpacerRenderer({ content, styles }: SpacerRendererProps) {
  const height = content?.height ?? 100;
  
  return (
    <div
      className="wp-block-spacer"
      style={{
        height: `${height}px`,
        ...styles,
      }}
      aria-hidden="true"
    />
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SpacerBlockComponent({
  value,
  onChange,
}: BlockComponentProps) {
  const { content, styles } = useBlockState<SpacerContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
  });

  return <SpacerRenderer content={content} styles={styles} />;
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface SpacerSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function SpacerSettings({ block, onUpdate }: SpacerSettingsProps) {
  const { content, updateContent } = useSettingsState<SpacerContent>({
    block,
    onUpdate,
    defaultContent: DEFAULT_CONTENT,
  });

  return (
    <div className="space-y-4">
      {/* Content Card */}
      <CollapsibleCard title="Content" icon={SpaceIcon} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <SettingsLabel htmlFor="spacer-height">Height (px)</SettingsLabel>
            <div className="flex items-center space-x-4">
              <Slider
                aria-label="Spacer height in pixels"
                value={[content?.height || 50]}
                onValueChange={([value]) => updateContent({ height: value })}
                max={200}
                min={10}
                step={5}
                className="flex-1"
              />
              <Input
                id="spacer-height"
                type="number"
                value={content?.height || 50}
                onChange={(e) => updateContent({ height: parseInt(e.target.value) || 50 })}
                className="w-20 h-9"
              />
            </div>
          </div>
        </div>
      </CollapsibleCard>

      {/* Settings Card (future extensibility) */}
      <CollapsibleCard title="Settings" icon={Settings} defaultOpen={true}>
        <div className="text-npb-text-muted text-xs">No additional settings.</div>
      </CollapsibleCard>
    </div>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const SpacerBlock: BlockDefinition = {
  id: 'core/spacer',
  label: 'Spacer',
  icon: SpaceIcon,
  description: 'Add vertical spacing',
  category: 'layout',
  defaultContent: {
    height: 100,
  },
  defaultStyles: {
    padding: '0px',
    margin: '0px',
  },
  component: SpacerBlockComponent,
  settings: SpacerSettings,
  hasSettings: true,
};

export default SpacerBlock;
