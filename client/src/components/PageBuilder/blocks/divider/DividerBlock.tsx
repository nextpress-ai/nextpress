import React from "react";
import type { BlockConfig } from "@shared/schema-types";
import type { BlockDefinition, BlockComponentProps } from "../types.ts";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { SettingsLabel } from '../../shared';
import { Minus as MinusIcon, Settings } from "lucide-react";
import { useBlockState } from "../useBlockState";
import { useSettingsState } from "../useSettingsState";

// ============================================================================
// TYPES
// ============================================================================

type DividerContent = {
  style?: string;
  color?: string;
  width?: number;
};

const DEFAULT_CONTENT: DividerContent = {
  style: 'solid',
  width: 100,
  color: '#cccccc',
};

// ============================================================================
// RENDERER
// ============================================================================

interface DividerRendererProps {
  content: DividerContent;
  styles?: React.CSSProperties;
}

function DividerRenderer({ content, styles }: DividerRendererProps) {
  return (
    <div style={{ padding: styles?.padding, margin: styles?.margin }}>
      <hr
        style={{
          borderStyle: content?.style as any,
          borderWidth: '1px 0 0 0',
          borderColor: content?.color,
          width: `${content?.width || 100}%`,
          margin: '0 auto',
        }}
      />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DividerBlockComponent({
  value,
  onChange,
}: BlockComponentProps) {
  const { content, styles } = useBlockState<DividerContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
  });

  return <DividerRenderer content={content} styles={styles} />;
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface DividerSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function DividerSettings({ block, onUpdate }: DividerSettingsProps) {
  const { content, updateContent } = useSettingsState<DividerContent>({
    block,
    onUpdate,
    defaultContent: DEFAULT_CONTENT,
  });

  return (
    <div className="space-y-4">
      {/* Content Card */}
      <CollapsibleCard title="Content" icon={MinusIcon} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <SettingsLabel htmlFor="divider-style">Line Style</SettingsLabel>
            <Select
              value={content?.style || 'solid'}
              onValueChange={(value) => updateContent({ style: value })}
            >
              <SelectTrigger id="divider-style" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="dashed">Dashed</SelectItem>
                <SelectItem value="dotted">Dotted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <SettingsLabel htmlFor="divider-color">Color</SettingsLabel>
            <div className="flex gap-3 mt-1">
              <Input
                id="divider-color"
                type="color"
                value={content?.color || '#cccccc'}
                onChange={(e) => updateContent({ color: e.target.value })}
                className="w-12 h-9 p-1 border-npb-border-default"
              />
              <Input
                value={content?.color || '#cccccc'}
                onChange={(e) => updateContent({ color: e.target.value })}
                placeholder="#cccccc"
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
            <SettingsLabel htmlFor="divider-width">Width (%)</SettingsLabel>
            <div className="flex items-center space-x-4 mt-1">
              <Slider
                aria-label="Divider width percentage"
                value={[content?.width || 100]}
                onValueChange={([value]) => updateContent({ width: value })}
                max={100}
                min={10}
                step={5}
                className="flex-1"
              />
              <Input
                id="divider-width"
                type="number"
                value={content?.width || 100}
                onChange={(e) => updateContent({ width: parseInt(e.target.value) || 100 })}
                className="w-20 h-9"
              />
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

const DividerBlock: BlockDefinition = {
  id: 'core/divider',
  label: 'Divider',
  icon: MinusIcon,
  description: 'Add a horizontal line',
  category: 'layout',
  defaultContent: {
    style: 'solid',
    width: 100,
    color: '#cccccc',
  },
  defaultStyles: {
    padding: '20px 0px',
  },
  component: DividerBlockComponent,
  settings: DividerSettings,
  hasSettings: true,
};

export default DividerBlock;
