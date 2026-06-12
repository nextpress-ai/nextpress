import React from "react";
import type { BlockConfig } from "@shared/schema-types";
import { Grid3x3 as GridIcon } from "lucide-react";
import { Droppable, Draggable, DropPlaceholder } from "@/lib/dnd";
import { useBlockActions } from "../../BlockActionsContext";
import BlockRenderer from "../../BlockRenderer";
import { createBlockDefinition } from "../createBlockDefinition";
import {
  type ColumnLayout,
  type ColumnsContent,
  readColumnsData,
  buildColumnsContainerStyle,
  buildColumnStyle,
} from "@shared/columns-layout";
import {
  getBlockSiblingFlexItemStyles,
  getBlockStackLayerWrapperStyles,
} from "@shared/block-container-placement";
import {
  DEFAULT_CONTENT,
  parseColumnsContent,
  serializeColumnsContent,
} from "./columns-model";
import { ColumnsSettings } from "./columns-settings";

// Re-exported for tests and external callers that import from this module.
export { buildColumnsLayout, removeColumnAndCleanup } from "./columns-model";

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
                  <div
                    key={childBlock.id}
                    style={{
                      width: "100%",
                      minWidth: 0,
                      ...getBlockSiblingFlexItemStyles(childBlock.styles, "column"),
                      ...getBlockStackLayerWrapperStyles(childBlock),
                    }}
                  >
                    <BlockRenderer
                      block={childBlock}
                      isSelected={false}
                      isPreview={true}
                      onDuplicate={() => {}}
                      onDelete={() => {}}
                    />
                  </div>
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
                        <React.Fragment key={childBlock.id}>
                        {snapshot.placeholderIndex === childIndex && <DropPlaceholder />}
                        <Draggable
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
                              style={{
                                width: "100%",
                                minWidth: 0,
                                ...getBlockSiblingFlexItemStyles(childBlock.styles, "column"),
                                ...getBlockStackLayerWrapperStyles(childBlock),
                              }}
                            >
                              <BlockRenderer
                                block={childBlock}
                                isSelected={
                                  actions?.selectedBlockId === childBlock.id
                                }
                                isPreview={false}
                                onDuplicate={() =>
                                  actions?.onDuplicate(childBlock.id)
                                }
                                onDelete={() => actions?.onDelete(childBlock.id)}
                                dragHandleProps={dragProvided.dragHandleProps}
                                onBlockChange={onBlockChange}
                              />
                            </div>
                        )}
                        </Draggable>
                        </React.Fragment>
                      ))
                    ) : (
                      <div className="text-center text-npb-text-muted p-8">
                        <small>Drop blocks here</small>
                      </div>
                    )}
                    {columnChildren.length > 0 && snapshot.placeholderIndex === columnChildren.length && <DropPlaceholder />}
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
// LAYOUT INIT (mount-only — persists columnLayout for DnD)
// ============================================================================

function useMountEffect(effect: () => void | (() => void)) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(effect, []);
}

type ColumnsBlockViewProps = {
  value: BlockConfig;
  content: ColumnsContent;
  styles?: React.CSSProperties;
  settings?: Record<string, unknown>;
  setSettings: (next: Record<string, unknown> | undefined) => void;
  isPreview?: boolean;
  onNestedBlockChange?: (updated: BlockConfig) => void;
};

function ColumnsBlockView({
  value,
  content,
  styles,
  settings,
  setSettings,
  isPreview,
  onNestedBlockChange,
}: ColumnsBlockViewProps) {
  useMountEffect(() => {
    const existing = settings?.columnLayout;
    if (Array.isArray(existing) && existing.length > 0) return;
    setSettings({
      ...(settings || {}),
      columnLayout: [{ columnId: "default-col-1", width: "100%", blockIds: [] }],
    });
  });

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
      onBlockChange={onNestedBlockChange}
    />
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const ColumnsBlock = createBlockDefinition<ColumnsContent>({
  id: "core/columns",
  label: "Columns",
  icon: GridIcon,
  description: "Flexible horizontal container for any blocks",
  category: "layout",
  isContainer: true,
  handlesOwnChildren: true,
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: { margin: "1em 0" },
  settings: ColumnsSettings,
  hasSettings: true,
  parseContent: parseColumnsContent,
  serializeContent: serializeColumnsContent,
  render: ({
    value,
    content,
    styles,
    settings,
    setSettings,
    isPreview,
    onNestedBlockChange,
  }) => (
    <ColumnsBlockView
      value={value}
      content={content}
      styles={styles}
      settings={settings}
      setSettings={setSettings as ColumnsBlockViewProps["setSettings"]}
      isPreview={isPreview}
      onNestedBlockChange={onNestedBlockChange}
    />
  ),
});

export default ColumnsBlock;
