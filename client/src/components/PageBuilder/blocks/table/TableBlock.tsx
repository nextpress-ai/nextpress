import React from "react";
import { Table as TableIcon, Plus, Minus, Heading as HeadingIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBlockDefinition } from "../createBlockDefinition";
import { BlockShell } from "../shared/block-shell";
import { sanitizeHtml } from "../../utils";
import {
  type TableContent,
  type TableData,
  type TableRow,
  DEFAULT_DATA,
} from "./table-model";
import { TableSettings } from "./table-settings";

// ============================================================================
// RENDERER & IN-CANVAS EDITOR
// ============================================================================

interface TableRendererProps {
  content: TableContent;
  styles?: React.CSSProperties;
  isEditing?: boolean;
  onUpdateContent?: (updates: Partial<TableData>) => void;
}

function TableRenderer({
  content,
  styles,
  isEditing,
  onUpdateContent,
}: TableRendererProps) {
  const tableData =
    content?.kind === "structured" ? (content.data as TableData) : DEFAULT_DATA;

  const body: TableRow[] = tableData?.body || [];
  const head: TableRow[] = tableData?.head || [];
  const foot: TableRow[] = tableData?.foot || [];
  const hasFixedLayout = Boolean(tableData?.hasFixedLayout);
  const isStriped = Boolean(tableData?.striped);
  const isBordered = tableData?.bordered !== false;
  const isCompact = Boolean(tableData?.compact);
  const caption = tableData?.caption || "";

  const createTable = (rows: number, cols: number) => {
    const newHead: TableRow[] = [
      {
        cells: Array(cols)
          .fill(null)
          .map((_, i) => ({ content: `Header ${i + 1}`, tag: "th" })),
      },
    ];
    const newBody: TableRow[] = Array(rows)
      .fill(null)
      .map((_, r) => ({
        cells: Array(cols)
          .fill(null)
          .map((_, c) => ({ content: `Cell ${r + 1}-${c + 1}`, tag: "td" })),
      }));
    onUpdateContent?.({ head: newHead, body: newBody, foot: [] });
  };

  const addRow = () => {
    const columnCount = head[0]?.cells.length || body[0]?.cells.length || 3;
    const newRow: TableRow = {
      cells: Array(columnCount)
        .fill(null)
        .map(() => ({ content: "", tag: "td" })),
    };
    onUpdateContent?.({ body: [...body, newRow] });
  };

  const removeRow = () => {
    if (body.length === 0) return;
    onUpdateContent?.({ body: body.slice(0, -1) });
  };

  const addColumn = () => {
    const newHead = head.map((row) => ({
      ...row,
      cells: [...row.cells, { content: `Header ${row.cells.length + 1}`, tag: "th" as const }],
    }));
    const newBody = body.map((row) => ({
      ...row,
      cells: [...row.cells, { content: "", tag: "td" as const }],
    }));
    const newFoot = foot.map((row) => ({
      ...row,
      cells: [...row.cells, { content: "", tag: "td" as const }],
    }));
    onUpdateContent?.({ head: newHead, body: newBody, foot: newFoot });
  };

  const removeColumn = () => {
    const colCount = head[0]?.cells.length || body[0]?.cells.length || 0;
    if (colCount <= 1) return;
    const newHead = head.map((row) => ({
      ...row,
      cells: row.cells.slice(0, -1),
    }));
    const newBody = body.map((row) => ({
      ...row,
      cells: row.cells.slice(0, -1),
    }));
    const newFoot = foot.map((row) => ({
      ...row,
      cells: row.cells.slice(0, -1),
    }));
    onUpdateContent?.({ head: newHead, body: newBody, foot: newFoot });
  };

  const toggleHeader = () => {
    if (head.length > 0) {
      onUpdateContent?.({ head: [] });
    } else {
      const colCount = body[0]?.cells.length || 3;
      const newHead: TableRow[] = [
        {
          cells: Array(colCount)
            .fill(null)
            .map((_, i) => ({ content: `Header ${i + 1}`, tag: "th" })),
        },
      ];
      onUpdateContent?.({ head: newHead });
    }
  };

  const updateCell = (
    section: "body" | "head" | "foot",
    rowIndex: number,
    cellIndex: number,
    value: string,
  ) => {
    const list = section === "body" ? body : section === "head" ? head : foot;
    const next = list.map((row, rIdx) => {
      if (rIdx !== rowIndex) return row;
      return {
        ...row,
        cells: row.cells.map((cell, cIdx) => {
          if (cIdx !== cellIndex) return cell;
          return { ...cell, content: value };
        }),
      };
    });
    onUpdateContent?.({ [section]: next });
  };

  if (body.length === 0 && head.length === 0) {
    return (
      <BlockShell
        blockClass="wp-block-table"
        className={[
          hasFixedLayout ? "has-fixed-layout" : "",
          tableData?.className || "",
        ]
          .filter(Boolean)
          .join(" ") || undefined}
        style={styles}
      >
        <div className="table-placeholder text-center text-npb-text-muted p-8 border-2 border-dashed border-npb-border-strong rounded">
          <TableIcon className="w-12 h-12 mx-auto mb-2 opacity-60" />
          <p className="font-medium text-sm">Table Block</p>
          <p className="text-xs text-npb-text-muted mb-4">Click a preset to insert a table</p>
          <div className="flex justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                createTable(3, 3);
              }}
            >
              3 × 3 Grid
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                createTable(4, 4);
              }}
            >
              4 × 4 Grid
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                createTable(5, 3);
              }}
            >
              5 × 3 Grid
            </Button>
          </div>
        </div>
      </BlockShell>
    );
  }

  const cellBorder = isBordered ? "1px solid var(--npb-border-default, #e5e7eb)" : "none";
  const cellPadding = isCompact ? "4px 8px" : "8px 12px";

  const getCellBg = (isHead: boolean, rowIndex?: number) => {
    if (isHead) return "var(--npb-surface-accent, #f8f9fa)";
    if (isStriped && rowIndex !== undefined && rowIndex % 2 === 1) {
      return "var(--npb-surface-card, #f9fafb)";
    }
    return "transparent";
  };

  return (
    <BlockShell
      as="figure"
      blockClass="wp-block-table"
      className={[
        hasFixedLayout ? "has-fixed-layout" : "",
        isStriped ? "is-style-stripes" : "",
        tableData?.className || "",
      ]
        .filter(Boolean)
        .join(" ") || undefined}
      style={styles}
    >
      {isEditing && (
        <div
          className="mb-2 flex flex-wrap items-center gap-1.5 p-1.5 bg-npb-surface-base border border-npb-border-default rounded-md text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2 flex items-center gap-1"
            onClick={addRow}
          >
            <Plus className="w-3 h-3" /> Row
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2 flex items-center gap-1"
            onClick={removeRow}
            disabled={body.length <= 1}
          >
            <Minus className="w-3 h-3" /> Row
          </Button>
          <div className="h-4 w-px bg-npb-border-default mx-0.5" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2 flex items-center gap-1"
            onClick={addColumn}
          >
            <Plus className="w-3 h-3" /> Col
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2 flex items-center gap-1"
            onClick={removeColumn}
            disabled={(head[0]?.cells.length || body[0]?.cells.length || 0) <= 1}
          >
            <Minus className="w-3 h-3" /> Col
          </Button>
          <div className="h-4 w-px bg-npb-border-default mx-0.5" />
          <Button
            type="button"
            variant={head.length > 0 ? "secondary" : "outline"}
            size="sm"
            className="h-7 text-xs px-2 flex items-center gap-1"
            onClick={toggleHeader}
          >
            <HeadingIcon className="w-3 h-3" /> Header
          </Button>
        </div>
      )}

      <div className="overflow-x-auto w-full">
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            tableLayout: hasFixedLayout ? "fixed" : "auto",
          }}
        >
          {caption && !isEditing ? (
            <caption className="text-xs text-npb-text-muted py-1">{caption}</caption>
          ) : null}
          {head.length > 0 && (
            <thead>
              {head.map((row, rowIndex) => (
                <tr key={`head-${rowIndex}`}>
                  {row.cells.map((cell, cellIndex) => (
                    <th
                      key={`head-cell-${cellIndex}`}
                      style={{
                        border: cellBorder,
                        padding: cellPadding,
                        backgroundColor: getCellBg(true),
                        fontWeight: "600",
                        textAlign: "left",
                      }}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={cell.content}
                          onChange={(e) =>
                            updateCell("head", rowIndex, cellIndex, e.target.value)
                          }
                          className="w-full bg-transparent border-0 outline-none font-semibold text-xs text-npb-text-primary focus:bg-background/80 rounded px-1"
                          placeholder={`Header ${cellIndex + 1}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: sanitizeHtml(cell.content),
                          }}
                        />
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
          )}
          <tbody>
            {body.map((row, rowIndex) => (
              <tr key={`body-${rowIndex}`}>
                {row.cells.map((cell, cellIndex) => {
                  const CellTag = cell.tag === "th" ? "th" : "td";
                  return (
                    <CellTag
                      key={`body-cell-${cellIndex}`}
                      style={{
                        border: cellBorder,
                        padding: cellPadding,
                        fontWeight: cell.tag === "th" ? "600" : "normal",
                        backgroundColor: getCellBg(cell.tag === "th", rowIndex),
                      }}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={cell.content}
                          onChange={(e) =>
                            updateCell("body", rowIndex, cellIndex, e.target.value)
                          }
                          className="w-full bg-transparent border-0 outline-none text-xs text-npb-text-primary focus:bg-background/80 rounded px-1"
                          placeholder={`R${rowIndex + 1}C${cellIndex + 1}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: sanitizeHtml(cell.content),
                          }}
                        />
                      )}
                    </CellTag>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {foot.length > 0 && (
            <tfoot>
              {foot.map((row, rowIndex) => (
                <tr key={`foot-${rowIndex}`}>
                  {row.cells.map((cell, cellIndex) => (
                    <td
                      key={`foot-cell-${cellIndex}`}
                      style={{
                        border: cellBorder,
                        padding: cellPadding,
                        backgroundColor: getCellBg(true),
                        fontWeight: "600",
                      }}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={cell.content}
                          onChange={(e) =>
                            updateCell("foot", rowIndex, cellIndex, e.target.value)
                          }
                          className="w-full bg-transparent border-0 outline-none text-xs text-npb-text-primary focus:bg-background/80 rounded px-1"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: sanitizeHtml(cell.content),
                          }}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tfoot>
          )}
        </table>
      </div>

      {isEditing && (
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          <Input
            value={caption}
            onChange={(e) => onUpdateContent?.({ caption: e.target.value })}
            placeholder="Table caption (optional)"
            className="h-7 text-xs"
          />
        </div>
      )}
    </BlockShell>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const TableBlock = createBlockDefinition<TableContent>({
  id: "core/table",
  label: "Table",
  icon: TableIcon,
  description: "Create a table to display data",
  category: "advanced",
  defaultContent: {
    kind: "structured",
    data: {
      head: [
        {
          cells: [
            { content: "Header 1", tag: "th" },
            { content: "Header 2", tag: "th" },
            { content: "Header 3", tag: "th" },
          ],
        },
      ],
      body: [
        {
          cells: [
            { content: "Cell 1", tag: "td" },
            { content: "Cell 2", tag: "td" },
            { content: "Cell 3", tag: "td" },
          ],
        },
        {
          cells: [
            { content: "Cell 4", tag: "td" },
            { content: "Cell 5", tag: "td" },
            { content: "Cell 6", tag: "td" },
          ],
        },
      ],
      foot: [],
      hasFixedLayout: false,
      striped: false,
      bordered: true,
      compact: false,
      caption: "",
      className: "",
    },
  },
  defaultStyles: {
    margin: "1em 0",
  },
  settings: TableSettings,
  hasSettings: true,
  render: ({ content, styles, isEditing, setContent }) => (
    <TableRenderer
      content={content}
      styles={styles}
      isEditing={isEditing}
      onUpdateContent={(updates) => {
        const currentData =
          content?.kind === "structured" ? (content.data as TableData) : DEFAULT_DATA;
        setContent({
          kind: "structured",
          data: {
            ...currentData,
            ...updates,
          },
        });
      }}
    />
  ),
});

export default TableBlock;
