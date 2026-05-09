import React from "react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import type { BlockDefinition, BlockComponentProps } from "../types";
import {
  Grid3x3 as GridIcon,
  Plus,
  Trash2,
  Wrench,
  Settings,
} from "lucide-react";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Droppable, Draggable } from "@/lib/dnd";
import { useBlockActions } from "../../BlockActionsContext";
import BlockRenderer from "../../BlockRenderer";
import { generateBlockId } from "../../utils";
import { getBlockStateAccessor } from "../blockStateRegistry";
import { useBlockState } from "../useBlockState";
import {
  type ColumnLayout,
  type ColumnsContent,
  type ColumnsData,
  readColumnsData,
  writeColumnsData,
  buildColumnsContainerStyle,
  buildColumnStyle,
} from "@shared/columns-layout";

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_CONTENT: ColumnsContent = {
  kind: "structured",
  data: {
    layoutMode: "flex",
    gap: "20px",
    minColumnWidth: "220px",
    verticalAlignment: "top",
    horizontalAlignment: "left",
    direction: "row",
    columnVerticalAlignment: "top",
    columnHorizontalAlignment: "stretch",
  },
};

function cloneColumnLayout(layout: ColumnLayout[]): ColumnLayout[] {
  return layout.map((column) => ({
    ...column,
    blockIds: [...column.blockIds],
  }));
}

function getOrderedChildIds(
  children: BlockConfig[],
  layout: ColumnLayout[],
): string[] {
  const childIds = children.map((child) => child.id);
  const assignedIds = new Set(
    layout.flatMap((column) =>
      Array.isArray(column.blockIds) ? column.blockIds : [],
    ),
  );

  return childIds.filter((id) => assignedIds.has(id)).concat(
    childIds.filter((id) => !assignedIds.has(id)),
  );
}

/**
 * Builds a new column layout and redistributes existing child blocks evenly.
 */
export function buildColumnsLayout(
  count: number,
  children: BlockConfig[],
  previousLayout: ColumnLayout[],
): ColumnLayout[] {
  const safeCount = Math.max(1, count);
  const width = `${(100 / safeCount).toFixed(2)}%`;
  const orderedChildIds = getOrderedChildIds(children, previousLayout);
  const nextLayout: ColumnLayout[] = Array.from({ length: safeCount }, () => ({
    columnId: `col-${generateBlockId()}`,
    width,
    blockIds: [],
  }));

  orderedChildIds.forEach((childId, index) => {
    nextLayout[index % safeCount].blockIds.push(childId);
  });

  return nextLayout;
}

/**
 * Removes a column and returns the remaining layout plus kept children.
 */
export function removeColumnAndCleanup(
  layout: ColumnLayout[],
  index: number,
  children: BlockConfig[],
): { nextLayout: ColumnLayout[]; nextChildren: BlockConfig[] } {
  if (layout.length <= 1) {
    return {
      nextLayout: cloneColumnLayout(layout),
      nextChildren: [...children],
    };
  }

  const nextLayout = cloneColumnLayout(layout);
  const [removedColumn] = nextLayout.splice(index, 1);
  if (!removedColumn) {
    return {
      nextLayout: cloneColumnLayout(layout),
      nextChildren: [...children],
    };
  }

  const removedIds = new Set(removedColumn.blockIds);
  nextLayout.forEach((column) => {
    column.blockIds = column.blockIds.filter((blockId) => !removedIds.has(blockId));
  });

  return {
    nextLayout,
    nextChildren: children.filter((child) => !removedIds.has(child.id)),
  };
}

// ============================================================================
// RENDERER
// ============================================================================

interface ColumnsRendererProps {
  content: ColumnsContent;
  styles?: React.CSSProperties;
  children?: BlockConfig[];
  columnLayout?: ColumnLayout[];
  isPreview?: boolean;
  onBlockChange?: (updated: BlockConfig) => void;
}

function ColumnsRenderer({
  content,
  styles,
  children,
  columnLayout,
  isPreview,
  onBlockChange,
}: ColumnsRendererProps) {
  const data = readColumnsData(content);
  const layoutMode = data.layoutMode || "flex";
  const direction = data.direction || "row";
  const minColumnWidth = data.minColumnWidth || "220px";
  const columnVerticalAlignment = data.columnVerticalAlignment || "top";
  const columnHorizontalAlignment = data.columnHorizontalAlignment || "stretch";

  const layout = columnLayout || [
    { columnId: "default-col-1", width: "100%", blockIds: [] },
  ];

  const childBlocks = children || [];

  // Column child alignment: since each column is a vertical flex container,
  // vertical alignment maps to `justifyContent` and horizontal alignment maps to `alignItems`.
  const columnAlignItems = {
    stretch: "stretch",
    left: "flex-start",
    center: "center",
    right: "flex-end",
  }[columnHorizontalAlignment];

  const columnJustifyContent = {
    top: "flex-start",
    center: "center",
    bottom: "flex-end",
    stretch: "stretch",
  }[columnVerticalAlignment];

  const actions = useBlockActions();
  const containerStyle = buildColumnsContainerStyle(data, layout, styles);

  return (
    <div className="wp-block-columns" style={containerStyle}>
      {layout.map((column) => {
        const columnChildren = childBlocks.filter((child) =>
          column.blockIds.includes(child.id)
        );
        const columnStyle = buildColumnStyle(data, layoutMode, direction, column, layout);

        return (
          <div
            key={column.columnId}
            className="wp-block-column"
              style={{
                ...columnStyle,
                display: "flex",
                flexDirection: "column",
              }}
            >
            {isPreview ? (
              <div
                className="space-y-2"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: columnAlignItems,
                  justifyContent: columnJustifyContent,
                  minHeight: "60px",
                  width: "100%",
                }}
              >
                {columnChildren.map((childBlock) => (
                  <BlockRenderer
                    key={childBlock.id}
                    block={childBlock}
                    isSelected={false}
                    isPreview={true}
                    onDuplicate={() => {}}
                    onDelete={() => {}}
                  />
                ))}
              </div>
            ) : (
              <Droppable droppableId={column.columnId} direction="vertical">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: columnJustifyContent,
                      alignItems: columnAlignItems,
                      minHeight: "60px",
                      border: snapshot.isDraggingOver ? "2px solid #3b82f6" : "2px dashed #e2e8f0",
                      borderRadius: "4px",
                      background: snapshot.isDraggingOver ? "rgba(59,130,246,0.06)" : undefined,
                      padding: "8px",
                      paddingBottom: columnChildren.length > 0 ? "20px" : "8px",
                    }}
                  >
                    {columnChildren.length > 0 ? (
                      columnChildren.map((childBlock, childIndex) => (
                        <Draggable
                          key={childBlock.id}
                          draggableId={childBlock.id}
                          index={childIndex}
                        >
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              className={`relative group ${
                                dragSnapshot.isDragging ? "opacity-50" : ""
                              }`}
                            >
                              <BlockRenderer
                                block={childBlock}
                                isSelected={actions?.selectedBlockId === childBlock.id}
                                isPreview={false}
                              onDuplicate={() => actions?.onDuplicate(childBlock.id)}
                              onDelete={() => actions?.onDelete(childBlock.id)}
                              dragHandleProps={dragProvided.dragHandleProps}
                              onBlockChange={onBlockChange}
                            />
                          </div>
                        )}
                        </Draggable>
                      ))
                    ) : (
                      <div className="text-center text-gray-400 p-8">
                        <small>Drop blocks here</small>
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ColumnsBlockComponent({
  value,
  onChange,
  isPreview,
}: BlockComponentProps) {
  const { content, styles, settings, setSettings } = useBlockState<ColumnsContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
  });

  // Ensure columnLayout exists in settings so DnD can resolve column drop zones.
  // Without this, the UI renders `default-col-1` but the drag handler can't map it
  // back to a Columns block (it looks only at `settings.columnLayout`).
  React.useEffect(() => {
    const existing = settings?.columnLayout;
    if (Array.isArray(existing) && existing.length > 0) return;
    setSettings({
      ...(settings || {}),
      columnLayout: [{ columnId: "default-col-1", width: "100%", blockIds: [] }],
    });
  }, [settings, setSettings]);

  const columnLayout =
    (settings?.columnLayout as ColumnLayout[] | undefined) || [
      { columnId: "default-col-1", width: "100%", blockIds: [] },
    ];

  return (
    <ColumnsRenderer
      content={content}
      styles={styles}
      children={value.children}
      columnLayout={columnLayout}
      isPreview={isPreview}
      onBlockChange={onChange}
    />
  );
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface ColumnsSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function ColumnsSettings({ block, onUpdate }: ColumnsSettingsProps) {
  const accessor = getBlockStateAccessor(block.id);
  const [, setUpdateTrigger] = React.useState(0);

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
      setUpdateTrigger((prev) => prev + 1);
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
      setUpdateTrigger((prev) => prev + 1);
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
    setUpdateTrigger((prev) => prev + 1);
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
            <Label aria-label="Number of columns">Columns ({columnLayout.length})</Label>
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
                <Label className="font-medium text-sm" aria-label={`Column ${index + 1}`}>
                  Column {index + 1}
                </Label>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeColumn(index)} className="text-red-600 h-6 w-6 p-0" aria-label={`Remove column ${index + 1}`}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              {layoutMode === "flex" ? (
                <div className="space-y-1">
                  <Label htmlFor={`col-width-${index}`} className="text-xs">
                    Width
                  </Label>
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
                <p className="text-xs text-gray-500">Equal width in grid mode</p>
              )}
            </div>
          ))}
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Settings" icon={Settings} defaultOpen={true}>
        <div className="space-y-3">
          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-4">
              <Label htmlFor="columns-layout-mode">Layout</Label>
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
              <Label htmlFor="columns-direction">Direction</Label>
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
              <Label htmlFor="columns-gap">Gap</Label>
            </div>
            <div className="col-span-8">
              <Input id="columns-gap" className="h-9" value={data.gap || "20px"} onChange={(e) => updateContent({ gap: e.target.value })} placeholder="e.g. 10px, 2rem" aria-label="Gap between columns" />
            </div>
          </div>

          {layoutMode === "flex" && data.direction !== "column" && (
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4">
                <Label htmlFor="columns-min-width">Min Width</Label>
              </div>
              <div className="col-span-8">
                <Input
                  id="columns-min-width"
                  className="h-9"
                  value={data.minColumnWidth || "220px"}
                  onChange={(e) => updateContent({ minColumnWidth: e.target.value })}
                  placeholder="220px"
                  aria-label="Minimum column width"
                />
              </div>
            </div>
          )}

          {layoutMode === "grid" && (
            <p className="text-xs text-gray-500">
              Grid mode uses equal-width columns automatically.
            </p>
          )}

          {layoutMode === "flex" && data.direction !== "column" && (
            <p className="text-xs text-gray-500">
              Flex row keeps columns on one line until they reach the minimum width, then wraps.
            </p>
          )}
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Advanced" icon={Wrench} defaultOpen={false}>
        <div className="space-y-3">
          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-4">
              <Label htmlFor="vertical-align">Vertical Alignment</Label>
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
              <Label htmlFor="horizontal-align">Horizontal Alignment</Label>
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
              <Label htmlFor="column-vertical-align">Column Vertical</Label>
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
              <Label htmlFor="column-horizontal-align">Column Horizontal</Label>
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

// ============================================================================
// LEGACY RENDERER (Backward Compatibility)
// ============================================================================

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const ColumnsBlock: BlockDefinition = {
  id: "core/columns",
  label: "Columns",
  icon: GridIcon,
  description: "Flexible horizontal container for any blocks",
  category: "layout",
  isContainer: true,
  handlesOwnChildren: true,
  defaultContent: { kind: "structured", data: { gap: "20px", verticalAlignment: "top", horizontalAlignment: "left", direction: "row" } },
  defaultStyles: { margin: '1em 0' },
  component: ColumnsBlockComponent,
  settings: ColumnsSettings,
  hasSettings: true,
};

export default ColumnsBlock;
