import React from "react";
import type { BlockConfig } from "@shared/schema-types";
import {
  Grid3x3 as GridIcon,
  Plus,
  Trash2,
  Wrench,
  Settings,
} from "lucide-react";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { SettingsLabel } from "../../shared";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { generateBlockId } from "../../utils";
import { useSettingsState } from "../useSettingsState";
import {
  type ColumnLayout,
  type ColumnsContent,
  type ColumnsData,
  readColumnsData,
  writeColumnsData,
} from "@shared/columns-layout";
import { DEFAULT_CONTENT, buildColumnsLayout, removeColumnAndCleanup } from "./columns-model";

export interface ColumnsSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

export function ColumnsSettings({ block, onUpdate }: ColumnsSettingsProps) {
  const { accessor, rerender } = useSettingsState({ block, onUpdate });

  // Get current state
  const content = accessor
    ? (accessor.getContent() as ColumnsContent)
    : (block.content as ColumnsContent) || DEFAULT_CONTENT;

  const currentSettings = accessor?.getSettings ? accessor.getSettings() : block.settings;
  const columnLayout = (currentSettings?.columnLayout as ColumnLayout[] | undefined) || [
    { columnId: "default-col-1", width: "100%", blockIds: [] },
  ];
  const childBlocks = Array.isArray(block.children) ? block.children : [];

  const data = readColumnsData(content);
  const layoutMode = data.layoutMode || "flex";

  // Update handlers
  const updateContent = (contentUpdates: Partial<ColumnsData>) => {
    if (accessor) {
      const current = accessor.getContent() as ColumnsContent;
      const currentData = readColumnsData(current);
      accessor.setContent(writeColumnsData(current, { ...currentData, ...contentUpdates }) as ColumnsContent);
      rerender();
    } else if (onUpdate) {
      onUpdate({ content: writeColumnsData(block.content, contentUpdates) });
    }
  };

  const updateBlock = (updates: Partial<BlockConfig>) => {
    if (accessor) {
      const current = accessor.getFullState?.() || block;
      onUpdate?.({
        ...current,
        ...updates,
      });
      return;
    }

    onUpdate?.(updates);
  };

  const updateSettings = (settingsUpdates: Partial<{ columnLayout: ColumnLayout[] }>) => {
    if (accessor?.setSettings) {
      const existing = accessor.getSettings?.() || {};
      accessor.setSettings({
        ...existing,
        ...settingsUpdates,
      });
      rerender();
    } else if (onUpdate) {
      onUpdate({
        settings: {
          ...(block.settings || {}),
          ...settingsUpdates,
        },
      });
    }
  };

  const updateColumnLayout = (newColumnLayout: ColumnLayout[]) => {
    updateSettings({ columnLayout: newColumnLayout });
  };

  const addColumn = () => {
    const newColumn: ColumnLayout = {
      columnId: generateBlockId(),
      width: "auto",
      blockIds: [],
    };
    updateColumnLayout([...columnLayout, newColumn]);
  };

  const removeColumn = (index: number) => {
    const { nextLayout, nextChildren } = removeColumnAndCleanup(
      columnLayout,
      index,
      childBlocks,
    );

    updateBlock({
      settings: {
        ...(currentSettings || {}),
        columnLayout: nextLayout,
      },
      children: nextChildren,
    });
    rerender();
  };

  const updateColumn = (index: number, updates: Partial<ColumnLayout>) => {
    const newColumnLayout = columnLayout.map((col, i) => (i === index ? { ...col, ...updates } : col));
    updateColumnLayout(newColumnLayout);
  };

  const addQuickColumns = (count: number) => {
    const newColumnLayout = buildColumnsLayout(count, childBlocks, columnLayout);
    updateColumnLayout(newColumnLayout);
  };

  return (
    <div className="space-y-4">
      <CollapsibleCard title="Content" icon={GridIcon} defaultOpen={true}>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <SettingsLabel aria-label="Number of columns">Columns ({columnLayout.length})</SettingsLabel>
            <Button type="button" variant="outline" size="sm" onClick={addColumn} aria-label="Add column">
              <Plus className="w-4 h-4 mr-1" />
              Add Column
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => addQuickColumns(2)} className="text-xs" aria-label="2 columns">
              2 Cols
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addQuickColumns(3)} className="text-xs" aria-label="3 columns">
              3 Cols
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addQuickColumns(4)} className="text-xs" aria-label="4 columns">
              4 Cols
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addQuickColumns(6)} className="text-xs" aria-label="6 columns">
              6 Cols
            </Button>
          </div>

          {columnLayout.map((column, index) => (
            <div key={column.columnId} className="border rounded p-3 space-y-2">
              <div className="flex justify-between items-center">
                <SettingsLabel aria-label={`Column ${index + 1}`}>
                  Column {index + 1}
                </SettingsLabel>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeColumn(index)} className="text-red-600 h-6 w-6 p-0" aria-label={`Remove column ${index + 1}`}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              {layoutMode === "flex" ? (
                <div className="space-y-1">
                  <SettingsLabel htmlFor={`col-width-${index}`} className="text-xs">
                    Width
                  </SettingsLabel>
                  <Input
                    id={`col-width-${index}`}
                    className="h-9 font-mono text-xs"
                    value={column.width ?? "auto"}
                    onChange={(e) => updateColumn(index, { width: e.target.value })}
                    onBlur={(e) => {
                      const t = e.target.value.trim();
                      const next = t.length === 0 ? "auto" : t;
                      if (next !== column.width) {
                        updateColumn(index, { width: next });
                      }
                    }}
                    placeholder="e.g. 50%, 240px, 1fr, auto"
                    aria-label={`Column ${index + 1} width`}
                  />
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Any CSS width (%, px, rem, calc), flex share (1fr, 2fr), or auto.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-npb-text-muted">Equal width in grid mode</p>
              )}
            </div>
          ))}
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Row layout" icon={Settings} defaultOpen={true}>
        <div className="space-y-3">
          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-4">
              <SettingsLabel htmlFor="columns-layout-mode">Layout</SettingsLabel>
            </div>
            <div className="col-span-8">
              <Select
                value={layoutMode}
                onValueChange={(value) =>
                  updateContent({ layoutMode: value as ColumnsData["layoutMode"] })
                }
              >
                <SelectTrigger className="h-9" id="columns-layout-mode" aria-label="Columns layout mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flex">Flex</SelectItem>
                  <SelectItem value="grid">Grid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-4">
              <SettingsLabel htmlFor="columns-direction">Direction</SettingsLabel>
            </div>
            <div className="col-span-8">
              <Select value={data.direction || "row"} onValueChange={(value) => updateContent({ direction: value as "row" | "column" })}>
                <SelectTrigger className="h-9" id="columns-direction" aria-label="Columns direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="row">Horizontal (Row)</SelectItem>
                  <SelectItem value="column">Vertical (Column)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-4">
              <SettingsLabel htmlFor="columns-gap">Gap</SettingsLabel>
            </div>
            <div className="col-span-8">
              <Input id="columns-gap" className="h-9" value={data.gap !== undefined && data.gap !== null && String(data.gap).trim() !== "" ? String(data.gap) : ""} onChange={(e) => updateContent({ gap: e.target.value })} placeholder="e.g. 20px, 2rem" aria-label="Gap between columns" />
            </div>
          </div>

          {layoutMode === "flex" && data.direction !== "column" && (
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4">
                <SettingsLabel htmlFor="columns-min-width">Min Width</SettingsLabel>
              </div>
              <div className="col-span-8">
                <Input
                  id="columns-min-width"
                  className="h-9"
                  value={
                    data.minColumnWidth !== undefined &&
                    data.minColumnWidth !== null &&
                    String(data.minColumnWidth).trim() !== ""
                      ? String(data.minColumnWidth)
                      : ""
                  }
                  onChange={(e) => updateContent({ minColumnWidth: e.target.value })}
                  placeholder="220px"
                  aria-label="Minimum column width"
                />
              </div>
            </div>
          )}

          {layoutMode === "grid" && (
            <p className="text-xs text-npb-text-muted">
              Grid mode uses equal-width columns automatically.
            </p>
          )}

          {layoutMode === "flex" && data.direction !== "column" && (
            <p className="text-xs text-npb-text-muted">
              Flex row keeps columns on one line until they reach the minimum width, then wraps.
            </p>
          )}
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Column alignment" icon={Wrench} defaultOpen={false}>
        <div className="space-y-3">
          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-4">
              <SettingsLabel htmlFor="vertical-align">Vertical Alignment</SettingsLabel>
            </div>
            <div className="col-span-8">
              <Select value={data.verticalAlignment || "top"} onValueChange={(value) => updateContent({ verticalAlignment: value as ColumnsData["verticalAlignment"] })}>
                <SelectTrigger className="h-9" id="vertical-align" aria-label="Vertical alignment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="bottom">Bottom</SelectItem>
                  <SelectItem value="stretch">Stretch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-4">
              <SettingsLabel htmlFor="horizontal-align">Horizontal Alignment</SettingsLabel>
            </div>
            <div className="col-span-8">
              <Select value={data.horizontalAlignment || "left"} onValueChange={(value) => updateContent({ horizontalAlignment: value as ColumnsData["horizontalAlignment"] })}>
                <SelectTrigger className="h-9" id="horizontal-align" aria-label="Horizontal alignment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                  <SelectItem value="space-between">Space Between</SelectItem>
                  <SelectItem value="space-around">Space Around</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-4">
              <SettingsLabel htmlFor="column-vertical-align">Column Vertical</SettingsLabel>
            </div>
            <div className="col-span-8">
              <Select
                value={data.columnVerticalAlignment || "top"}
                onValueChange={(value) =>
                  updateContent({
                    columnVerticalAlignment:
                      value as ColumnsData["columnVerticalAlignment"],
                  })
                }
              >
                <SelectTrigger className="h-9" id="column-vertical-align" aria-label="Column vertical alignment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="bottom">Bottom</SelectItem>
                  <SelectItem value="stretch">Stretch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-4">
              <SettingsLabel htmlFor="column-horizontal-align">Column Horizontal</SettingsLabel>
            </div>
            <div className="col-span-8">
              <Select
                value={data.columnHorizontalAlignment || "stretch"}
                onValueChange={(value) =>
                  updateContent({
                    columnHorizontalAlignment:
                      value as ColumnsData["columnHorizontalAlignment"],
                  })
                }
              >
                <SelectTrigger className="h-9" id="column-horizontal-align" aria-label="Column horizontal alignment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stretch">Stretch</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CollapsibleCard>
    </div>
  );
}
