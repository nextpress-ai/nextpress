import React from "react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { SettingsLabel } from "../../shared";
import { Settings, Layout } from "lucide-react";
import { useSettingsState } from "../useSettingsState";
import { type GroupContent, DEFAULT_CONTENT, LAYOUT_PRESETS } from "./group-model";

export interface GroupSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

export function GroupSettings({ block, onUpdate }: GroupSettingsProps) {
  const { accessor, rerender } = useSettingsState({ block, onUpdate });

  // Get current state
  const content = accessor
    ? (accessor.getContent() as GroupContent)
    : (block.content as GroupContent) || DEFAULT_CONTENT;

  // Update handlers
  const updateContent = (updates: Partial<GroupContent>) => {
    if (accessor) {
      const current = accessor.getContent() as GroupContent;
      accessor.setContent({ ...current, ...updates });
      rerender();
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
          <SettingsLabel className="text-sm text-npb-text-secondary">Quick layout configurations</SettingsLabel>
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
                    ? 'bg-npb-surface-raised border-npb-border-strong text-npb-accent'
                    : 'bg-npb-surface-base border-npb-border-default hover:bg-npb-interactive-bg-hover'
                }`}
              >
                <div className="font-medium">{preset.label}</div>
                <div className="text-npb-text-muted mt-0.5">{preset.description}</div>
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
            <SettingsLabel>HTML Tag</SettingsLabel>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {htmlTagOptions.slice(0, 4).map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateContent({ tagName: option.value })}
                  className={`flex items-center justify-center p-3 text-sm font-medium rounded-lg border transition-colors ${
                    currentTag === option.value
                      ? 'bg-npb-interactive-bg-active text-npb-text-primary border-npb-border-default hover:bg-npb-interactive-bg-active'
                      : 'bg-npb-surface-base text-npb-text-secondary border-npb-border-default hover:bg-npb-interactive-bg-hover'
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
                      ? 'bg-npb-interactive-bg-active text-npb-text-primary border-npb-border-default hover:bg-npb-interactive-bg-active'
                      : 'bg-npb-surface-base text-npb-text-secondary border-npb-border-default hover:bg-npb-interactive-bg-hover'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Display Type */}
          <div>
            <SettingsLabel>Display Type</SettingsLabel>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {displayOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateContent({ display: option.value as any })}
                  className={`flex items-center justify-center p-3 text-sm font-medium rounded-lg border transition-colors ${
                    currentDisplay === option.value
                      ? 'bg-npb-interactive-bg-active text-npb-text-primary border-npb-border-default hover:bg-npb-interactive-bg-active'
                      : 'bg-npb-surface-base text-npb-text-secondary border-npb-border-default hover:bg-npb-interactive-bg-hover'
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
              <SettingsLabel htmlFor="flex-direction">Direction</SettingsLabel>
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
              <SettingsLabel htmlFor="flex-wrap">Wrap</SettingsLabel>
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
              <SettingsLabel htmlFor="align-items">Align Items</SettingsLabel>
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
              <SettingsLabel htmlFor="justify-content">Justify Content</SettingsLabel>
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
              <SettingsLabel htmlFor="flex-gap">Gap</SettingsLabel>
              <Input
                id="flex-gap"
                value={
                  content?.gap !== undefined &&
                  content.gap !== null &&
                  String(content.gap).trim() !== ""
                    ? String(content.gap)
                    : ""
                }
                onChange={(e) => updateContent({ gap: e.target.value })}
                placeholder="e.g. 0px, 10px, 1rem"
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
              <SettingsLabel htmlFor="grid-columns">Grid Template Columns</SettingsLabel>
              <Input
                id="grid-columns"
                value={content?.gridTemplateColumns || 'repeat(auto-fill, minmax(200px, 1fr))'}
                onChange={(e) => updateContent({ gridTemplateColumns: e.target.value })}
                placeholder="e.g. repeat(3, 1fr), 1fr 2fr"
              />
              <p className="text-xs text-npb-text-muted mt-1">
                Examples: repeat(2, 1fr) | repeat(auto-fill, minmax(200px, 1fr)) | 1fr 2fr
              </p>
            </div>

            {/* Grid Template Rows */}
            <div>
              <SettingsLabel htmlFor="grid-rows">Grid Template Rows</SettingsLabel>
              <Input
                id="grid-rows"
                value={content?.gridTemplateRows || ''}
                onChange={(e) => updateContent({ gridTemplateRows: e.target.value })}
                placeholder="auto (default)"
              />
            </div>

            {/* Align Items */}
            <div>
              <SettingsLabel htmlFor="grid-align">Align Items</SettingsLabel>
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
              <SettingsLabel htmlFor="grid-gap">Gap</SettingsLabel>
              <Input
                id="grid-gap"
                value={
                  content?.gap !== undefined &&
                  content.gap !== null &&
                  String(content.gap).trim() !== ""
                    ? String(content.gap)
                    : ""
                }
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
            <SettingsLabel htmlFor="group-width">Width</SettingsLabel>
            <Input
              id="group-width"
              value={content?.width || ''}
              onChange={(e) => updateContent({ width: e.target.value })}
              placeholder="auto (e.g. 100%, 500px)"
            />
          </div>

          {/* Min Width */}
          <div>
            <SettingsLabel htmlFor="group-min-width">Min Width</SettingsLabel>
            <Input
              id="group-min-width"
              value={content?.minWidth || ''}
              onChange={(e) => updateContent({ minWidth: e.target.value })}
              placeholder="0 (e.g. 200px, 50%)"
            />
          </div>

          {/* Max Width */}
          <div>
            <SettingsLabel htmlFor="group-max-width">Max Width</SettingsLabel>
            <Input
              id="group-max-width"
              value={content?.maxWidth || ''}
              onChange={(e) => updateContent({ maxWidth: e.target.value })}
              placeholder="none (e.g. 1200px, 100%)"
            />
          </div>

          {/* Height */}
          <div>
            <SettingsLabel htmlFor="group-height">Height</SettingsLabel>
            <Input
              id="group-height"
              value={content?.height || ''}
              onChange={(e) => updateContent({ height: e.target.value })}
              placeholder="auto (e.g. 100vh, 400px)"
            />
          </div>

          {/* Min Height */}
          <div>
            <SettingsLabel htmlFor="group-min-height">Min Height</SettingsLabel>
            <Input
              id="group-min-height"
              value={content?.minHeight || ''}
              onChange={(e) => updateContent({ minHeight: e.target.value })}
              placeholder="0 (e.g. 200px, 50vh)"
            />
          </div>

          {/* Overflow */}
          <div>
            <SettingsLabel htmlFor="group-overflow">Overflow</SettingsLabel>
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
