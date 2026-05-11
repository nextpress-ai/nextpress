import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleCard } from "@/components/ui/collapsible-card";

import { 
  Palette, 
  Type, 
  Layout, 
  Code, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Bold,
  Italic,
  ExternalLink,
  Target,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Ruler,
  Square,
  Circle,
  Hash,
  Move,
  RotateCw,
  Columns,
  Rows,
  Grid3X3,
  Minus,
  Settings,
  Sparkles
} from "lucide-react";
import type { BlockConfig, DisplayCondition } from "@shared/schema-types";
import { blockRegistry } from "./blocks";
import { ConditionBuilder } from "@/components/Templates/ConditionBuilder";
import { VariablePicker } from "@/components/Templates/VariablePicker";
import { getBlockStateAccessor } from "./blocks/blockStateRegistry";
import type { CSSProperties } from "react";
import TokenColorPicker from "./TokenColorPicker"
import AnimationPicker from "./AnimationPicker"
import type { TokenEntry, BlockAnimation } from "@shared/schema-types"
import { FreeformSpacingSideRow } from "./freeform-spacing-side-row";

/** Font options matching PageSettings — same fonts available at block level */
const FONT_OPTIONS = [
  { value: '', label: 'Default (Inherit)' },
  { value: 'system-ui', label: 'System Default' },
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Merriweather, serif', label: 'Merriweather' },
  { value: 'Lato, sans-serif', label: 'Lato' },
  { value: '"Open Sans", sans-serif', label: 'Open Sans' },
  { value: '"Playfair Display", serif', label: 'Playfair Display' },
  { value: '"Source Sans Pro", sans-serif', label: 'Source Sans Pro' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
] as const;

interface BlockSettingsProps {
  block: BlockConfig;
  onUpdate: (updates: Partial<BlockConfig>) => void;
  onHoverArea?: (area: 'padding' | 'margin' | null) => void;
}

export default function BlockSettings({ block, onUpdate, onHoverArea }: BlockSettingsProps) {
  const [customCss, setCustomCss] = useState(block.customCss || '');
  const accessor = getBlockStateAccessor(block.id);

  // Display conditions from block settings
  const displayConditions: DisplayCondition[] =
    (block.settings?.displayConditions as DisplayCondition[]) ?? [];

  const updateDisplayConditions = (conditions: DisplayCondition[]) => {
    updateSettings({ displayConditions: conditions.length > 0 ? conditions : undefined });
  };

  const updateContent = (contentUpdates: any) => {
    if (accessor) {
      const current = accessor.getContent();
      accessor.setContent({
        ...(typeof current === "object" && current !== null ? current : {}),
        ...contentUpdates,
      });
    } else {
      onUpdate({
        content: {
          ...block.content,
          ...contentUpdates,
        },
      });
    }
  };

  const updateStyles = (styleUpdates: any) => {
    if (accessor) {
      const current = accessor.getStyles() || {};
      accessor.setStyles({
        ...current,
        ...styleUpdates,
      });
    } else {
      onUpdate({
        styles: {
          ...block.styles,
          ...styleUpdates,
        },
      });
    }
  };

  const updateSettings = (settingUpdates: any) => {
    if (accessor) {
      const current = accessor.getSettings() || {};
      accessor.setSettings({
        ...current,
        ...settingUpdates,
      });
    } else {
      onUpdate({
        settings: {
          ...block.settings,
          ...settingUpdates,
        },
      });
    }
  };

  const handleCustomCssChange = (css: string) => {
    setCustomCss(css);
    onUpdate({ customCss: css });
  };

  // Token system helpers
  const getTokenEntry = (property: string): TokenEntry | undefined => {
    return block.other?.tokenMap?.[property]
  }

  const updateTokenEntry = (entry: TokenEntry) => {
    const currentOther = block.other || {}
    const currentTokenMap = currentOther.tokenMap || {}
    onUpdate({
      other: {
        ...currentOther,
        tokenMap: {
          ...currentTokenMap,
          [entry.property]: entry,
        },
      },
    })
  }

  // Animation system helper
  // Uses null (not undefined) to clear animation, because deepMerge skips undefined values
  const updateAnimation = (animation: BlockAnimation | undefined) => {
    const currentOther = block.other || {}
    onUpdate({
      other: {
        ...currentOther,
        animation: animation ?? null,
      },
    })
  }

  const purgeTokenMapKeys = (keys: string[]) => {
    const cur = block.other?.tokenMap;
    if (!cur) return;
    let changed = false;
    const next = { ...cur };
    for (const k of keys) {
      if (next[k] != null) {
        delete next[k];
        changed = true;
      }
    }
    if (!changed) return;
    onUpdate({
      other: {
        ...block.other,
        tokenMap: next,
      },
    });
  };

  /** Writes one padding/margin side as raw CSS, clears conflicting tokenMap entry, drops shorthand `padding`/`margin` when needed. */
  const commitSpacingSide = (cssKey: keyof CSSProperties, fullValue: string | null) => {
    purgeTokenMapKeys([String(cssKey)]);
    const shorthand =
      String(cssKey).startsWith("padding") && cssKey !== "padding"
        ? ("padding" as const)
        : String(cssKey).startsWith("margin") && cssKey !== "margin"
          ? ("margin" as const)
          : null;

    if (accessor) {
      const s = { ...(accessor.getStyles() || {}) } as Record<string, unknown>;
      if (shorthand && s[shorthand] != null) delete s[shorthand];
      if (fullValue == null || fullValue === "") {
        delete s[String(cssKey)];
      } else {
        s[String(cssKey)] = fullValue;
      }
      accessor.setStyles(s as CSSProperties);
    } else {
      const s = { ...(block.styles || {}) } as Record<string, unknown>;
      if (shorthand && s[shorthand] != null) delete s[shorthand];
      if (fullValue == null || fullValue === "") {
        delete s[String(cssKey)];
      } else {
        s[String(cssKey)] = fullValue;
      }
      onUpdate({ styles: s as BlockConfig["styles"] });
    }
  };

  // Get individual spacing values with fallbacks
  const getPaddingValues = () => {
    const padding = block.styles?.padding;
    if (padding) {
      const paddingStr = typeof padding === "string" ? padding : String(padding);
      const values = paddingStr.split(" ").map((v: string) => v.trim());
      if (values.length === 1)
        return { top: values[0], right: values[0], bottom: values[0], left: values[0] };
      if (values.length === 2)
        return { top: values[0], right: values[1], bottom: values[0], left: values[1] };
      if (values.length === 4)
        return { top: values[0], right: values[1], bottom: values[2], left: values[3] };
    }
    return {
      top: String(block.styles?.paddingTop || ""),
      right: String(block.styles?.paddingRight || ""),
      bottom: String(block.styles?.paddingBottom || ""),
      left: String(block.styles?.paddingLeft || ""),
    };
  };

  const getMarginValues = () => {
    const margin = block.styles?.margin;
    if (margin) {
      const marginStr = typeof margin === "string" ? margin : String(margin);
      const values = marginStr.split(" ").map((v: string) => v.trim());
      if (values.length === 1)
        return { top: values[0], right: values[0], bottom: values[0], left: values[0] };
      if (values.length === 2)
        return { top: values[0], right: values[1], bottom: values[0], left: values[1] };
      if (values.length === 4)
        return { top: values[0], right: values[1], bottom: values[2], left: values[3] };
    }
    return {
      top: String(block.styles?.marginTop || ""),
      right: String(block.styles?.marginRight || ""),
      bottom: String(block.styles?.marginBottom || ""),
      left: String(block.styles?.marginLeft || ""),
    };
  };

  const renderContentSettings = () => {
    const def = blockRegistry[block.name];
    
    // For component pattern blocks, use the legacy settings function if available
    // This allows settings to be shown in sidebar while block manages its own state
    if (def?.component && def?.settings) {
      const SettingsComp = def.settings;
      return <SettingsComp block={block} onUpdate={onUpdate} />;
    }
    
    // Legacy pattern: use block's settings component
    if (def?.settings) {
      const SettingsComp = def.settings;
      return <SettingsComp block={block} onUpdate={onUpdate} />;
    }
    
    return (
      <div className="text-center text-gray-500 py-8">
        No content settings available for this block type.
      </div>
    );
  };



  // Enhanced chip-based control component with grid layout and truncation
  const ChipGroup = ({ 
    label, 
    options, 
    value, 
    onChange, 
    icon: Icon,
    className = ""
  }: { 
    label: string; 
    options: { value: string; label: string; icon?: any }[]; 
    value: string; 
    onChange: (value: string) => void; 
    icon?: any;
    className?: string;
  }) => {
    // Determine grid layout based on number of options - use 2x2 grid for 3+ options
    const getGridLayout = () => {
      if (options.length === 1) return "grid-cols-1";
      if (options.length === 2) return "grid-cols-2";
      // For 3+ options, use 2x2 grid (2 columns, rows as needed)
      return "grid-cols-2";
    };

    const truncateText = (text: string, maxLength: number = 8) => {
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    return (
      <div className={`space-y-3 ${className}`}>
        {label && (
          <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4" />}
            {label}
          </Label>
        )}
        <div className={`grid ${getGridLayout()} gap-2`}>
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`h-10 px-2 text-xs font-medium border rounded-none transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:ring-offset-1 min-w-0 ${
                value === option.value 
                  ? "bg-gray-200 text-gray-800 border-gray-200 hover:bg-gray-300" 
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
              }`}
              title={option.label} // Tooltip for truncated text
            >
              <div className="flex items-center justify-center gap-1 min-w-0">
                {option.icon && <option.icon className="w-3 h-3 flex-shrink-0" />}
                <span className="truncate min-w-0">{truncateText(option.label)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderStyleSettings = () => {
    const isColumnsBlock = block.name === "core/columns";
    const showTypographyStyles = [
      "heading",
      "core/heading",
      "text",
      "core/paragraph",
      "button",
      "core/button",
    ].includes(block.name);
    const showFlowTextAlign = ["heading", "core/heading", "text", "core/paragraph"].includes(
      block.name,
    );
    const showButtonLabelAlign = ["button", "core/button"].includes(block.name);
    const sideLabel: Record<string, string> = {
      paddingTop: "Top",
      paddingRight: "Right",
      paddingBottom: "Bottom",
      paddingLeft: "Left",
      marginTop: "Top",
      marginRight: "Right",
      marginBottom: "Bottom",
      marginLeft: "Left",
    };
    return (
      <div className="space-y-6">
        {/* Typography */}
        {showTypographyStyles && (
          <CollapsibleCard title="Typography" icon={Type} defaultOpen={true}>
            {/* Font Family */}
            <div>
              <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Type className="w-3 h-3" />
                Font Family
              </Label>
              <select
                value={block.styles?.fontFamily || ''}
                onChange={(e) => updateStyles({ fontFamily: e.target.value || undefined })}
                className="mt-2 w-full h-9 px-3 text-sm border border-gray-200 rounded-none bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
              >
                {FONT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div>
              <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Ruler className="w-3 h-3" />
                Font Size
              </Label>
              <Input
                value={block.styles?.fontSize || '16px'}
                onChange={(e) => updateStyles({ fontSize: e.target.value })}
                placeholder="16px"
                className="mt-2 h-9 text-sm border-gray-200 rounded-none focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
              />
            </div>
            
            {/* Line Height - Full Width */}
            <div>
              <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Rows className="w-3 h-3" />
                Line Height
              </Label>
              <Input
                value={block.styles?.lineHeight || '1.6'}
                onChange={(e) => updateStyles({ lineHeight: e.target.value })}
                placeholder="1.6"
                className="mt-2 h-9 text-sm border-gray-200 rounded-none focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
              />
            </div>
            
            {/* Font Weight - Chip Grid */}
            <ChipGroup
              label="Font Weight"
              icon={Bold}
              options={[
                { value: '300', label: 'Light', icon: Minus },
                { value: 'normal', label: 'Normal', icon: Circle },
                { value: '500', label: 'Medium', icon: Square },
                { value: 'bold', label: 'Bold', icon: Bold },
              ]}
              value={String(block.styles?.fontWeight ?? 'normal')}
              onChange={(value) => updateStyles({ fontWeight: String(value) })}
            />

            {/* Paragraph / heading: flowing block text */}
            {showFlowTextAlign && (
              <ChipGroup
                label="Text alignment"
                icon={AlignCenter}
                options={[
                  { value: "left", label: "Left", icon: AlignLeft },
                  { value: "center", label: "Center", icon: AlignCenter },
                  { value: "right", label: "Right", icon: AlignRight },
                  { value: "justify", label: "Justify", icon: AlignJustify },
                ]}
                value={block.styles?.textAlign || "left"}
                onChange={(value) => updateStyles({ textAlign: value })}
              />
            )}

            {showButtonLabelAlign && (
              <div className="space-y-2">
                <p className="text-xs text-gray-600">
                  Aligns the label inside the button. Use{' '}
                  <span className="font-semibold">Position in container</span>
                  {' '}below to move the whole button in the layout.
                </p>
                <ChipGroup
                  label="Label alignment (inside button)"
                  icon={AlignCenter}
                  options={[
                    { value: "left", label: "Left", icon: AlignLeft },
                    { value: "center", label: "Center", icon: AlignCenter },
                    { value: "right", label: "Right", icon: AlignRight },
                  ]}
                  value={block.styles?.textAlign || "center"}
                  onChange={(value) => updateStyles({ textAlign: value })}
                />
              </div>
            )}
          </CollapsibleCard>
        )}

        {/* Colors */}
        <CollapsibleCard title="Colors" icon={Palette} defaultOpen={true}>
          {/* Text Color */}
          <div>
            <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Type className="w-3 h-3" />
              Text Color
            </Label>
            <div className="mt-2">
              <TokenColorPicker
                property="color"
                currentEntry={getTokenEntry("color")}
                currentStyleValue={block.styles?.color as string | undefined}
                onChange={updateTokenEntry}
              />
            </div>
          </div>
          
          {/* Background Color */}
          <div>
            <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Square className="w-3 h-3" />
              Background Color
            </Label>
            <div className="mt-2">
              <TokenColorPicker
                property="backgroundColor"
                currentEntry={getTokenEntry("backgroundColor")}
                currentStyleValue={block.styles?.backgroundColor as string | undefined}
                onChange={updateTokenEntry}
              />
            </div>
          </div>
        </CollapsibleCard>

        {/* Spacing */}
        <CollapsibleCard title="Spacing" icon={Move} defaultOpen={true}>
          <p className="text-xs text-gray-600 mb-3">
            Type each value as freeform CSS spacing: lengths like <span className="font-mono">16px</span>,{' '}
            <span className="font-mono">120 px</span> or <span className="font-mono">100 rem</span> (spaces are fine), or{' '}
            <span className="font-mono">100rem</span> without spaces; also <span className="font-mono">auto</span>,
            percentages, or <span className="font-mono">calc(…)</span>.
          </p>

          {/* Padding */}
          <div className="mb-8">
            <div className="mb-3">
              <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Square className="w-3 h-3" />
                Padding
              </Label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  ["paddingTop", "top"],
                  ["paddingRight", "right"],
                  ["paddingBottom", "bottom"],
                  ["paddingLeft", "left"],
                ] as const
              ).map(([prop, corner]) => (
                <FreeformSpacingSideRow
                  key={prop}
                  label={sideLabel[prop]}
                  value={getPaddingValues()[corner]}
                  hoverArea="padding"
                  onHoverArea={onHoverArea}
                  onCommit={(full) => commitSpacingSide(prop, full)}
                />
              ))}
            </div>
          </div>

          {/* Margin */}
          <div>
            <div className="mb-3">
              <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Square className="w-3 h-3" />
                Margin
              </Label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  ["marginTop", "top"],
                  ["marginRight", "right"],
                  ["marginBottom", "bottom"],
                  ["marginLeft", "left"],
                ] as const
              ).map(([prop, corner]) => (
                <FreeformSpacingSideRow
                  key={prop}
                  label={sideLabel[prop]}
                  value={getMarginValues()[corner]}
                  hoverArea="margin"
                  onHoverArea={onHoverArea}
                  onCommit={(full) => commitSpacingSide(prop, full)}
                />
              ))}
            </div>
          </div>
        </CollapsibleCard>

        <CollapsibleCard title="Position in container" icon={Layout} defaultOpen={false}>
          <p className="text-xs text-gray-600 mb-3">
            Where this block sits among siblings (canvas, columns, flex row/column stacks). Uses flex layout;
            vertical center/bottom shows when extra space exists in the parent.
          </p>
          <ChipGroup
            label="Horizontal"
            icon={AlignLeft}
            options={[
              { value: "__unset", label: "Default", icon: Circle },
              { value: "left", label: "Left", icon: AlignLeft },
              { value: "center", label: "Center", icon: AlignCenter },
              { value: "right", label: "Right", icon: AlignRight },
            ]}
            value={
              (block.styles?.contentAlignHorizontal ??
                "__unset") as string
            }
            onChange={(v) =>
              updateStyles({
                contentAlignHorizontal:
                  v === "__unset"
                    ? null
                    : (v as "left" | "center" | "right"),
              })
            }
          />
          <ChipGroup
            label="Vertical"
            icon={AlignCenter}
            className="mt-4"
            options={[
              { value: "__unset", label: "Default", icon: Circle },
              { value: "top", label: "Top", icon: ChevronUp },
              { value: "middle", label: "Middle", icon: AlignCenter },
              { value: "bottom", label: "Bottom", icon: ChevronDown },
            ]}
            value={
              (block.styles?.contentAlignVertical ?? "__unset") as string
            }
            onChange={(v) =>
              updateStyles({
                contentAlignVertical:
                  v === "__unset" ? null : (v as "top" | "middle" | "bottom"),
              })
            }
          />
        </CollapsibleCard>

        {/* Layout & Dimensions */}
        <CollapsibleCard title="Layout & Dimensions" icon={Layout} defaultOpen={false}>
            {/* Width */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Columns className="w-3 h-3" />
                  Width
                </Label>
                <select
                  className="h-7 px-2 text-xs border border-gray-200 rounded-none bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
                  value={block.styles?.width ? (block.styles.width === '100%' ? 'Fill' : block.styles.width === 'fit-content' ? 'Fit' : block.styles.width === 'auto' ? 'Auto' : 'Custom') : 'Auto'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'Auto') updateStyles({ width: 'auto' });
                    else if (val === 'Fill') updateStyles({ width: '100%' });
                    else if (val === 'Fit') updateStyles({ width: 'fit-content' });
                  }}
                >
                  <option>Auto</option>
                  <option>Fill</option>
                  <option>Fit</option>
                  <option>Custom</option>
                </select>
              </div>
              <Input
                value={block.styles?.width || 'auto'}
                onChange={(e) => updateStyles({ width: e.target.value })}
                placeholder="auto"
                className="h-8 text-sm border-gray-200 rounded-none focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>

            {/* Max Width */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Columns className="w-3 h-3" />
                  Max Width
                </Label>
              </div>
              <Input
                value={block.styles?.maxWidth || ''}
                onChange={(e) => updateStyles({ maxWidth: e.target.value || undefined })}
                placeholder="none"
                className="h-8 text-sm border-gray-200 rounded-none focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
            
            {/* Display Type for Layout-capable Blocks
                NOTE: `core/columns` layout is controlled via its own Content settings to avoid conflicts.
             */}
            {['container', 'core/group'].includes(block.name) && (
              <>
                  <div>
                    <Label className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Grid3X3 className="w-3 h-3" />
                      Display
                    </Label>
                  <ChipGroup
                    label=""
                    options={[
                      { value: 'block', label: 'Block' },
                      { value: 'flex', label: 'Flex' },
                      { value: 'grid', label: 'Grid' },
                      { value: 'inline', label: 'Inline' },
                    ]}
                    value={block.styles?.display || 'block'}
                    onChange={(value) => updateStyles({ display: value })}
                  />
                </div>

                {/* Flex Direction (if display is flex) */}
                {(block.styles?.display === 'flex' || block.styles?.display === 'inline-flex') && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <RotateCw className="w-3 h-3" />
                      Direction
                    </Label>
                    <ChipGroup
                      label=""
                      options={[
                        { value: 'row', label: 'Row' },
                        { value: 'column', label: 'Column' },
                        { value: 'row-reverse', label: 'Row Rev' },
                        { value: 'column-reverse', label: 'Col Rev' },
                      ]}
                      value={block.styles?.flexDirection || 'row'}
                      onChange={(value) => updateStyles({ flexDirection: value })}
                    />
                  </div>
                )}

                {/* Flex Wrap (if display is flex) */}
                {(block.styles?.display === 'flex' || block.styles?.display === 'inline-flex') && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Rows className="w-3 h-3" />
                      Wrap
                    </Label>
                    <ChipGroup
                      label=""
                      options={[
                        { value: 'nowrap', label: 'No Wrap' },
                        { value: 'wrap', label: 'Wrap' },
                        { value: 'wrap-reverse', label: 'Wrap Rev' },
                      ]}
                      value={block.styles?.flexWrap || 'nowrap'}
                      onChange={(value) => updateStyles({ flexWrap: value })}
                    />
                  </div>
                )}

                {/* Justify Content */}
                <div>
                  <Label className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <AlignCenter className="w-3 h-3" />
                    Justify
                  </Label>
                  <ChipGroup
                    label=""
                    options={[
                      { value: 'flex-start', label: 'Start' },
                      { value: 'center', label: 'Center' },
                      { value: 'flex-end', label: 'End' },
                      { value: 'space-between', label: 'Between' },
                      { value: 'space-around', label: 'Around' },
                    ]}
                    value={block.styles?.justifyContent || 'flex-start'}
                    onChange={(value) => updateStyles({ justifyContent: value })}
                  />
                </div>

                {/* Align Items */}
                <div>
                  <Label className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <AlignLeft className="w-3 h-3" />
                    Align
                  </Label>
                  <ChipGroup
                    label=""
                    options={[
                      { value: 'flex-start', label: 'Start' },
                      { value: 'center', label: 'Center' },
                      { value: 'flex-end', label: 'End' },
                      { value: 'stretch', label: 'Stretch' },
                    ]}
                    value={block.styles?.alignItems || 'flex-start'}
                    onChange={(value) => updateStyles({ alignItems: value })}
                  />
                </div>

                {/* Gap */}
                {!isColumnsBlock && (
                  <div>
                  <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Move className="w-3 h-3" />
                    Gap
                  </Label>
                  <Input
                    value={block.styles?.gap || ''}
                    onChange={(e) => updateStyles({ gap: e.target.value || undefined })}
                    placeholder="e.g. 16px, 1rem"
                    className="mt-2 h-8 text-sm border-gray-200 rounded-none focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                  </div>
                )}
              </>
            )}

            {/* Height for specific blocks */}
            {['image', 'video', 'container', 'core/group'].includes(block.name) && (
              <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <Rows className="w-3 h-3" />
                      Height
                    </Label>
                  <select
                    className="h-7 px-2 text-xs border border-gray-200 rounded-none bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
                    value={block.styles?.height ? (block.styles.height === 'auto' ? 'Auto' : block.styles.height === 'min-content' ? 'Min Content' : block.styles.height === 'max-content' ? 'Max Content' : 'Custom') : 'Auto'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'Auto') updateStyles({ height: 'auto' });
                      else if (val === 'Min Content') updateStyles({ height: 'min-content' });
                      else if (val === 'Max Content') updateStyles({ height: 'max-content' });
                    }}
                  >
                    <option>Auto</option>
                    <option>Min Content</option>
                    <option>Max Content</option>
                    <option>Custom</option>
                  </select>
                </div>
                <Input
                  value={block.styles?.height || 'auto'}
                  onChange={(e) => updateStyles({ height: e.target.value })}
                  placeholder="auto"
                  className="h-8 text-sm border-gray-200 rounded-none focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
            )}

            {/* Overflow */}
            {['container', 'core/group'].includes(block.name) && (
              <div>
                <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Square className="w-3 h-3" />
                  Overflow
                </Label>
                <ChipGroup
                  label=""
                  options={[
                    { value: 'visible', label: 'Visible' },
                    { value: 'hidden', label: 'Hidden' },
                    { value: 'auto', label: 'Auto' },
                    { value: 'scroll', label: 'Scroll' },
                  ]}
                  value={block.styles?.overflow || 'visible'}
                  onChange={(value) => updateStyles({ overflow: value })}
                />
              </div>
            )}

            {/* For Columns, keep true dimensions here, but avoid duplicating layout controls. */}
            {isColumnsBlock && (
              <div>
                <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <Square className="w-3 h-3" />
                  Overflow
                </Label>
                <ChipGroup
                  label=""
                  options={[
                    { value: 'visible', label: 'Visible' },
                    { value: 'hidden', label: 'Hidden' },
                    { value: 'auto', label: 'Auto' },
                    { value: 'scroll', label: 'Scroll' },
                  ]}
                  value={block.styles?.overflow || 'visible'}
                  onChange={(value) => updateStyles({ overflow: value })}
                />
              </div>
            )}
        </CollapsibleCard>

        {/* Border */}
        <CollapsibleCard title="Border & Radius" icon={Square} defaultOpen={false}>
          {/* Border - Full Width */}
          <div>
            <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Square className="w-3 h-3" />
              Border
            </Label>
            <Input
              value={block.styles?.border || 'none'}
              onChange={(e) => updateStyles({ border: e.target.value })}
              placeholder="1px solid #ccc"
              className="mt-2 h-9 text-sm border-gray-200 rounded-none focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
            />
          </div>
          
          {/* Border Radius - Full Width */}
          <div>
            <Label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Circle className="w-3 h-3" />
              Border Radius
            </Label>
            <Input
              value={block.styles?.borderRadius || '0px'}
              onChange={(e) => updateStyles({ borderRadius: e.target.value })}
              placeholder="4px"
              className="mt-2 h-9 text-sm border-gray-200 rounded-none focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
            />
          </div>
        </CollapsibleCard>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 rounded-none border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Block Settings</h3>
        <p className="text-xs text-gray-600">{blockRegistry[block.name]?.label || block.name}</p>
      </div>

      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger 
            value="content"
            className="flex items-center gap-2 text-gray-600 data-[state=active]:text-black data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium px-3 py-2 rounded-md transition-all text-xs"
          >
            <Type className="w-3 h-3" /> Content
          </TabsTrigger>
          <TabsTrigger 
            value="style"
            className="flex items-center gap-2 text-gray-600 data-[state=active]:text-black data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium px-3 py-2 rounded-md transition-all text-xs"
          >
            <Palette className="w-3 h-3" /> Style
          </TabsTrigger>
          <TabsTrigger 
            value="advanced"
            className="flex items-center gap-2 text-gray-600 data-[state=active]:text-black data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium px-3 py-2 rounded-md transition-all text-xs"
          >
            <Code className="w-3 h-3" /> Advanced
          </TabsTrigger>
          <TabsTrigger 
            value="conditions"
            className="flex items-center gap-2 text-gray-600 data-[state=active]:text-black data-[state=active]:bg-white data-[state=active]:shadow-sm font-medium px-3 py-2 rounded-md transition-all text-xs"
          >
            <Settings className="w-3 h-3" /> Conditions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4 mt-4">
          <div className="bg-gray-50 rounded-none p-4 border border-gray-200">
            {/* Variable insertion for blocks with text content */}
            {typeof (block.content as Record<string, unknown>)?.value === 'string' && (
              <div className="mb-4 pb-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-gray-800">
                    Insert Variable
                  </Label>
                  <VariablePicker
                    onInsert={(variable) => {
                      const currentValue = (block.content as Record<string, unknown>)?.value as string || '';
                      updateContent({ value: currentValue + variable });
                    }}
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Click a variable to append it to the block content below
                </p>
              </div>
            )}
            {renderContentSettings()}
          </div>
        </TabsContent>

        <TabsContent value="style" className="space-y-4 mt-4">
          <div className="bg-gray-50 rounded-none p-4 border border-gray-200">
            {renderStyleSettings()}
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4 mt-4">
          <div className="bg-gray-50 rounded-none p-4 border border-gray-200">
            {/* Animation Section */}
            <CollapsibleCard title="Animations" icon={Sparkles} defaultOpen={false}>
              <AnimationPicker
                animation={block.other?.animation}
                blockId={block.id}
                onChange={updateAnimation}
              />
            </CollapsibleCard>

            <div className="mt-4">
              <CollapsibleCard title="Custom CSS" icon={Code} defaultOpen={false}>
                  <div className="space-y-3">
                    <Textarea
                      value={customCss}
                      onChange={(e) => handleCustomCssChange(e.target.value)}
                      placeholder="/* Add your custom CSS here */&#10;.my-block {&#10;  /* styles */&#10;}"
                      rows={8}
                      className="font-mono text-sm resize-none"
                    />
                    <p className="text-xs text-gray-500">
                      CSS will be applied to this block only. Use standard CSS syntax.
                    </p>
                  </div>
              </CollapsibleCard>
            </div>

            {/* Anchor ID & CSS Classes — available for all blocks */}
            <div className="mt-4">
              <CollapsibleCard title="HTML Anchor & Classes" icon={Hash} defaultOpen={false}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="block-anchor" className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <Target className="w-3 h-3" />
                      Anchor ID
                    </Label>
                    <Input
                      id="block-anchor"
                      value={(block.content as Record<string, unknown>)?.anchor as string || ''}
                      onChange={(e) => updateContent({ anchor: e.target.value })}
                      placeholder="Add an anchor (without #)"
                      className="mt-2 h-9 text-sm border-gray-200 rounded-none focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Used for linking directly to this block via #anchor
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="block-classes" className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <Code className="w-3 h-3" />
                      CSS Classes
                    </Label>
                    <Input
                      id="block-classes"
                      value={(block.content as Record<string, unknown>)?.className as string || ''}
                      onChange={(e) => updateContent({ className: e.target.value })}
                      placeholder="e.g. my-custom-class"
                      className="mt-2 h-9 text-sm border-gray-200 rounded-none focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                    />
                  </div>
                </div>
              </CollapsibleCard>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="conditions" className="space-y-4 mt-4">
          <div className="bg-gray-50 rounded-none p-4 border border-gray-200">
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-semibold text-gray-800">
                  Display Conditions
                </Label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Control when this block is visible. Add conditions to show or
                  hide the block based on page type, user status, or URL.
                </p>
              </div>
              <ConditionBuilder
                conditions={displayConditions}
                onChange={updateDisplayConditions}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}