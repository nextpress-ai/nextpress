import React from "react";
import type { JSX } from "react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import type { BlockDefinition, BlockComponentProps } from "../types.ts";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { ContainerChildren } from "../../BlockRenderer";
import { Package as GroupIcon, Settings, Layout } from "lucide-react";
import { getBlockStateAccessor } from "../blockStateRegistry";
import { useBlockState } from "../useBlockState";

// ============================================================================
// TYPES
// ============================================================================

type GroupContent = {
  tagName?: string;
  className?: string;
  display?: 'block' | 'flex' | 'grid' | 'inline' | 'inline-flex' | 'inline-block';
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  gap?: string;
  rowGap?: string;
  columnGap?: string;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  overflow?: 'visible' | 'hidden' | 'auto' | 'scroll';
  minWidth?: string;
  maxWidth?: string;
  minHeight?: string;
  maxHeight?: string;
  width?: string;
  height?: string;
  layoutPreset?: string;
};

/** Named layout presets for quick container configuration */
export const LAYOUT_PRESETS: Record<string, Partial<GroupContent> & { label: string; description: string }> = {
  'default': {
    label: 'Default',
    description: 'Standard block layout',
    display: 'block',
  },
  'flex-column': {
    label: 'Vertical Stack',
    description: 'Items stacked vertically with flex',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  'flex-row': {
    label: 'Horizontal Row',
    description: 'Items side by side, wraps on small screens',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: '16px',
  },
  'flex-center': {
    label: 'Centered',
    description: 'Content centered both ways',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  'flex-between': {
    label: 'Space Between',
    description: 'Items spread evenly across container',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
  },
  'grid-2col': {
    label: '2-Column Grid',
    description: 'Equal two-column grid layout',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  'grid-3col': {
    label: '3-Column Grid',
    description: 'Equal three-column grid layout',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  'grid-auto': {
    label: 'Auto Grid',
    description: 'Responsive auto-fill grid',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
  },
  'sidebar-left': {
    label: 'Sidebar Left',
    description: 'Fixed sidebar with flexible main area',
    display: 'grid',
    gridTemplateColumns: '250px 1fr',
    gap: '24px',
  },
  'sidebar-right': {
    label: 'Sidebar Right',
    description: 'Flexible main area with fixed sidebar',
    display: 'grid',
    gridTemplateColumns: '1fr 250px',
    gap: '24px',
  },
  'hero-centered': {
    label: 'Hero Centered',
    description: 'Full-width centered hero section',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
    minHeight: '400px',
    className: 'text-center',
  },
};

const DEFAULT_CONTENT: GroupContent = {
  tagName: 'div',
  className: '',
  display: 'block',
  flexDirection: 'column',
  flexWrap: 'nowrap',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  gap: '0px',
  overflow: 'visible',
};

// ============================================================================
// RENDERER
// ============================================================================

interface GroupRendererProps {
  hostBlock: BlockConfig;
  content: GroupContent;
  styles?: React.CSSProperties;
  children?: BlockConfig[];
  isPreview?: boolean;
}

function GroupRenderer({ hostBlock, content, styles, children, isPreview }: GroupRendererProps) {
  const tagName = content?.tagName || 'div';
  const className = [
    'wp-block-group',
    content?.className || '',
  ].filter(Boolean).join(' ');
  const TagName = tagName as keyof JSX.IntrinsicElements;

  const display = content?.display || 'block';
  const flexDirection = content?.flexDirection || 'column';
  const flexWrap = content?.flexWrap || 'nowrap';
  const alignItems = content?.alignItems || 'flex-start';
  const justifyContent = content?.justifyContent || 'flex-start';
  const gap = content?.gap || '0px';
  const overflow = content?.overflow || 'visible';

  const containerStyle: React.CSSProperties = {
    ...styles,
    padding: styles?.padding || '1.25em 2.375em',
    ...(display === 'flex' || display === 'inline-flex' ? {
      display,
      flexDirection,
      flexWrap,
      alignItems,
      justifyContent,
      gap,
    } : {}),
    ...(display === 'grid' ? {
      display: 'grid',
      gridTemplateColumns: content?.gridTemplateColumns || 'repeat(auto-fill, minmax(200px, 1fr))',
      gridTemplateRows: content?.gridTemplateRows,
      gap,
      alignItems,
      justifyContent,
    } : {}),
    ...(display === 'block' || display === 'inline-block' || display === 'inline' ? {
      display,
    } : {}),
    overflow,
    minWidth: content?.minWidth,
    maxWidth: content?.maxWidth,
    minHeight: content?.minHeight,
    maxHeight: content?.maxHeight,
    width: content?.width || styles?.width,
    height: content?.height || styles?.height,
    boxSizing: 'border-box',
  };

  // Real block id/name so ContainerChildren registers a valid droppableId for insert/move.
  const blockForChildren: BlockConfig = {
    ...hostBlock,
    content: content as any,
    styles,
    children: children ?? hostBlock.children ?? [],
  };

  return (
    <TagName
      className={className}
      style={containerStyle}
    >
      <div className="wp-block-group__inner-container">
        <ContainerChildren block={blockForChildren} isPreview={isPreview ?? false} />
      </div>
    </TagName>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GroupBlockComponent({
  value,
  onChange,
  isPreview,
}: BlockComponentProps) {
  const { content, styles } = useBlockState<GroupContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
  });

  return (
    <GroupRenderer
      hostBlock={value}
      content={content}
      styles={styles}
      children={value.children}
      isPreview={isPreview}
    />
  );
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface GroupSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function GroupSettings({ block, onUpdate }: GroupSettingsProps) {
  const accessor = getBlockStateAccessor(block.id);
  const [, setUpdateTrigger] = React.useState(0);

  // Get current state
  const content = accessor
    ? (accessor.getContent() as GroupContent)
    : (block.content as GroupContent) || DEFAULT_CONTENT;

  // Update handlers
  const updateContent = (updates: Partial<GroupContent>) => {
    if (accessor) {
      const current = accessor.getContent() as GroupContent;
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

  const displayOptions = [
    { value: 'block', label: 'Block' },
    { value: 'flex', label: 'Flex' },
    { value: 'grid', label: 'Grid' },
    { value: 'inline', label: 'Inline' },
    { value: 'inline-flex', label: 'Inline Flex' },
    { value: 'inline-block', label: 'Inline Block' },
  ];

  const htmlTagOptions = [
    { value: 'div', label: 'div' },
    { value: 'section', label: 'section' },
    { value: 'article', label: 'article' },
    { value: 'main', label: 'main' },
    { value: 'header', label: 'header' },
    { value: 'footer', label: 'footer' },
    { value: 'aside', label: 'aside' },
    { value: 'nav', label: 'nav' }
  ];

  const currentDisplay = content?.display || 'block';
  const currentTag = content?.tagName || 'div';

  return (
    <div className="space-y-4">
      <CollapsibleCard
        title="Layout Presets"
        icon={Layout}
        defaultOpen={true}
      >
        <div className="space-y-3">
          <Label className="text-sm text-gray-600">Quick layout configurations</Label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(LAYOUT_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => {
                  const { label, description, ...presetStyles } = preset;
                  updateContent({
                    layoutPreset: key,
                    ...presetStyles,
                  } as Partial<GroupContent>);
                }}
                className={`p-2 text-left text-xs rounded border transition-colors ${
                  content?.layoutPreset === key
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">{preset.label}</div>
                <div className="text-gray-500 mt-0.5">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard
        title="Wrapper & display"
        icon={Settings}
        defaultOpen={true}
      >
        <div className="space-y-4">
          {/* HTML Tag */}
          <div>
            <Label>HTML Tag</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {htmlTagOptions.slice(0, 4).map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateContent({ tagName: option.value })}
                  className={`flex items-center justify-center p-3 text-sm font-medium rounded-lg border transition-colors ${
                    currentTag === option.value
                      ? 'bg-gray-200 text-gray-800 border-gray-200 hover:bg-gray-300'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {htmlTagOptions.slice(4).map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateContent({ tagName: option.value })}
                  className={`flex items-center justify-center p-3 text-sm font-medium rounded-lg border transition-colors ${
                    currentTag === option.value
                      ? 'bg-gray-200 text-gray-800 border-gray-200 hover:bg-gray-300'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Display Type */}
          <div>
            <Label>Display Type</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {displayOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateContent({ display: option.value as any })}
                  className={`flex items-center justify-center p-3 text-sm font-medium rounded-lg border transition-colors ${
                    currentDisplay === option.value
                      ? 'bg-gray-200 text-gray-800 border-gray-200 hover:bg-gray-300'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleCard>

      {currentDisplay === 'flex' && (
        <CollapsibleCard
          title="Flex Layout"
          icon={Layout}
          defaultOpen={true}
        >
          <div className="space-y-4">
            {/* Flex Direction */}
            <div>
              <Label htmlFor="flex-direction">Direction</Label>
              <Select
                value={content?.flexDirection || 'column'}
                onValueChange={(value) => updateContent({ flexDirection: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="row">Horizontal (Row)</SelectItem>
                  <SelectItem value="column">Vertical (Column)</SelectItem>
                  <SelectItem value="row-reverse">Row Reverse</SelectItem>
                  <SelectItem value="column-reverse">Column Reverse</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Flex Wrap */}
            <div>
              <Label htmlFor="flex-wrap">Wrap</Label>
              <Select
                value={content?.flexWrap || 'nowrap'}
                onValueChange={(value) => updateContent({ flexWrap: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nowrap">No Wrap</SelectItem>
                  <SelectItem value="wrap">Wrap</SelectItem>
                  <SelectItem value="wrap-reverse">Wrap Reverse</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Align Items */}
            <div>
              <Label htmlFor="align-items">Align Items</Label>
              <Select
                value={content?.alignItems || 'flex-start'}
                onValueChange={(value) => updateContent({ alignItems: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flex-start">Start</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="flex-end">End</SelectItem>
                  <SelectItem value="stretch">Stretch</SelectItem>
                  <SelectItem value="baseline">Baseline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Justify Content */}
            <div>
              <Label htmlFor="justify-content">Justify Content</Label>
              <Select
                value={content?.justifyContent || 'flex-start'}
                onValueChange={(value) => updateContent({ justifyContent: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flex-start">Start</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="flex-end">End</SelectItem>
                  <SelectItem value="space-between">Space Between</SelectItem>
                  <SelectItem value="space-around">Space Around</SelectItem>
                  <SelectItem value="space-evenly">Space Evenly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gap */}
            <div>
              <Label htmlFor="flex-gap">Gap</Label>
              <Input
                id="flex-gap"
                value={content?.gap || '0px'}
                onChange={(e) => updateContent({ gap: e.target.value })}
                placeholder="e.g. 10px, 1rem"
              />
            </div>
          </div>
        </CollapsibleCard>
      )}

      {currentDisplay === 'grid' && (
        <CollapsibleCard
          title="Grid Layout"
          icon={Layout}
          defaultOpen={true}
        >
          <div className="space-y-4">
            {/* Grid Template Columns */}
            <div>
              <Label htmlFor="grid-columns">Grid Template Columns</Label>
              <Input
                id="grid-columns"
                value={content?.gridTemplateColumns || 'repeat(auto-fill, minmax(200px, 1fr))'}
                onChange={(e) => updateContent({ gridTemplateColumns: e.target.value })}
                placeholder="e.g. repeat(3, 1fr), 1fr 2fr"
              />
              <p className="text-xs text-gray-500 mt-1">
                Examples: repeat(2, 1fr) | repeat(auto-fill, minmax(200px, 1fr)) | 1fr 2fr
              </p>
            </div>

            {/* Grid Template Rows */}
            <div>
              <Label htmlFor="grid-rows">Grid Template Rows</Label>
              <Input
                id="grid-rows"
                value={content?.gridTemplateRows || ''}
                onChange={(e) => updateContent({ gridTemplateRows: e.target.value })}
                placeholder="auto (default)"
              />
            </div>

            {/* Align Items */}
            <div>
              <Label htmlFor="grid-align">Align Items</Label>
              <Select
                value={content?.alignItems || 'stretch'}
                onValueChange={(value) => updateContent({ alignItems: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="start">Start</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="end">End</SelectItem>
                  <SelectItem value="stretch">Stretch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gap */}
            <div>
              <Label htmlFor="grid-gap">Gap</Label>
              <Input
                id="grid-gap"
                value={content?.gap || '16px'}
                onChange={(e) => updateContent({ gap: e.target.value })}
                placeholder="e.g. 16px, 1rem"
              />
            </div>
          </div>
        </CollapsibleCard>
      )}

      <CollapsibleCard
        title="Sizing & Overflow"
        icon={Settings}
        defaultOpen={false}
      >
        <div className="space-y-4">
          {/* Width */}
          <div>
            <Label htmlFor="group-width">Width</Label>
            <Input
              id="group-width"
              value={content?.width || ''}
              onChange={(e) => updateContent({ width: e.target.value })}
              placeholder="auto (e.g. 100%, 500px)"
            />
          </div>

          {/* Min Width */}
          <div>
            <Label htmlFor="group-min-width">Min Width</Label>
            <Input
              id="group-min-width"
              value={content?.minWidth || ''}
              onChange={(e) => updateContent({ minWidth: e.target.value })}
              placeholder="0 (e.g. 200px, 50%)"
            />
          </div>

          {/* Max Width */}
          <div>
            <Label htmlFor="group-max-width">Max Width</Label>
            <Input
              id="group-max-width"
              value={content?.maxWidth || ''}
              onChange={(e) => updateContent({ maxWidth: e.target.value })}
              placeholder="none (e.g. 1200px, 100%)"
            />
          </div>

          {/* Height */}
          <div>
            <Label htmlFor="group-height">Height</Label>
            <Input
              id="group-height"
              value={content?.height || ''}
              onChange={(e) => updateContent({ height: e.target.value })}
              placeholder="auto (e.g. 100vh, 400px)"
            />
          </div>

          {/* Min Height */}
          <div>
            <Label htmlFor="group-min-height">Min Height</Label>
            <Input
              id="group-min-height"
              value={content?.minHeight || ''}
              onChange={(e) => updateContent({ minHeight: e.target.value })}
              placeholder="0 (e.g. 200px, 50vh)"
            />
          </div>

          {/* Overflow */}
          <div>
            <Label htmlFor="group-overflow">Overflow</Label>
            <Select
              value={content?.overflow || 'visible'}
              onValueChange={(value) => updateContent({ overflow: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visible">Visible</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="scroll">Scroll</SelectItem>
              </SelectContent>
            </Select>
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

const GroupBlock: BlockDefinition = {
  id: 'core/group',
  label: 'Group',
  icon: GroupIcon,
  description: 'Gather blocks in a layout container',
  category: 'layout',
  isContainer: true,
  handlesOwnChildren: true,
  defaultContent: {
    tagName: 'div',
    className: '',
    display: 'block',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: '0px',
  },
  defaultStyles: {
    padding: '1.25em 2.375em',
  },
  component: GroupBlockComponent,
  settings: GroupSettings,
  hasSettings: true,
};

export default GroupBlock;
