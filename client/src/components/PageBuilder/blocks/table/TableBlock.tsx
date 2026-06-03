import React from "react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import type { BlockDefinition, BlockComponentProps } from "../types.ts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { SettingsLabel } from '../../shared';
import { Plus, Trash2, Table as TableIcon, Settings } from "lucide-react";
import { getBlockStateAccessor } from "../blockStateRegistry";
import { useBlockState } from "../useBlockState";
import { sanitizeHtml } from "../../utils";

// ============================================================================
// TYPES
// ============================================================================

interface TableCell {
  content: string;
  tag: 'td' | 'th';
}

interface TableRow {
  cells: TableCell[];
}

type TableData = {
  body?: TableRow[];
  head?: TableRow[];
  foot?: TableRow[];
  hasFixedLayout?: boolean;
  caption?: string;
  className?: string;
};

type TableContent = BlockContent & {
  data?: TableData;
};

const DEFAULT_DATA: TableData = {
  body: [],
  head: [],
  foot: [],
  hasFixedLayout: false,
  caption: '',
  className: '',
};

const DEFAULT_CONTENT: TableContent = {
  kind: 'structured',
  data: DEFAULT_DATA,
};

// ============================================================================
// RENDERER
// ============================================================================

interface TableRendererProps {
  content: TableContent;
  styles?: React.CSSProperties;
}

function TableRenderer({ content, styles }: TableRendererProps) {
  const tableData = content?.kind === 'structured' ? (content.data as TableData) : DEFAULT_DATA;
  
  const body: TableRow[] = tableData?.body || [];
  const head: TableRow[] = tableData?.head || [];
  const foot: TableRow[] = tableData?.foot || [];
  const hasFixedLayout = tableData?.hasFixedLayout || false;
  const caption = tableData?.caption || '';
  
  const className = [
    "wp-block-table",
    hasFixedLayout ? 'has-fixed-layout' : '',
    tableData?.className || "",
  ].filter(Boolean).join(" ");

  if (body.length === 0) {
    return (
      <div className={className} style={styles}>
        <div className="table-placeholder text-center text-npb-text-muted p-8 border-2 border-dashed border-npb-border-strong rounded">
          <TableIcon className="w-12 h-12 mx-auto mb-2" />
          <p>Table</p>
          <small>Add a table to display data</small>
        </div>
      </div>
    );
  }

  return (
    <figure className={className} style={styles}>
      <table style={{
        borderCollapse: 'collapse',
        width: '100%',
        tableLayout: hasFixedLayout ? 'fixed' : 'auto',
      }}>
        {caption && <caption>{caption}</caption>}
        {head.length > 0 && (
          <thead>
            {head.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.cells.map((cell, cellIndex) => (
                  <th
                    key={cellIndex}
                    style={{
                      border: '1px solid #ddd',
                      padding: '8px',
                      backgroundColor: '#f8f9fa',
                      fontWeight: 'bold',
                    }}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(cell.content) }}
                  />
                ))}
              </tr>
            ))}
          </thead>
        )}
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.cells.map((cell, cellIndex) => {
                const CellTag = cell.tag || 'td';
                return (
                  <CellTag
                    key={cellIndex}
                    style={{
                      border: '1px solid #ddd',
                      padding: '8px',
                      fontWeight: cell.tag === 'th' ? 'bold' : 'normal',
                      backgroundColor: cell.tag === 'th' ? '#f8f9fa' : 'transparent',
                    }}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(cell.content) }}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
        {foot.length > 0 && (
          <tfoot>
            {foot.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.cells.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    style={{
                      border: '1px solid #ddd',
                      padding: '8px',
                      backgroundColor: '#f8f9fa',
                      fontWeight: 'bold',
                    }}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(cell.content) }}
                  />
                ))}
              </tr>
            ))}
          </tfoot>
        )}
      </table>
    </figure>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TableBlockComponent({
  value,
  onChange,
}: BlockComponentProps) {
  const { content, styles } = useBlockState<TableContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
  });

  return <TableRenderer content={content} styles={styles} />;
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface TableSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function TableSettings({ block, onUpdate }: TableSettingsProps) {
  const accessor = getBlockStateAccessor(block.id);
  const [, setUpdateTrigger] = React.useState(0);

  // Get current state
  const content = accessor
    ? (accessor.getContent() as TableContent)
    : (block.content as TableContent) || DEFAULT_CONTENT;

  const tableData = content?.kind === 'structured' 
    ? (content.data as TableData) 
    : DEFAULT_DATA;
  
  const body: TableRow[] = tableData?.body || [];
  const head: TableRow[] = tableData?.head || [];
  const foot: TableRow[] = tableData?.foot || [];

  // Update handlers
  const updateContent = (updates: Partial<TableData>) => {
    if (accessor) {
      const current = accessor.getContent() as TableContent;
      const currentData = current?.kind === 'structured' ? (current.data as TableData) : DEFAULT_DATA;
      accessor.setContent({
        ...current,
        kind: 'structured',
        data: {
          ...currentData,
          ...updates,
        },
      } as TableContent);
      setUpdateTrigger((prev) => prev + 1);
    } else if (onUpdate) {
      onUpdate({
        content: {
          kind: 'structured',
          data: {
            ...tableData,
            ...updates,
          },
        } as BlockContent,
      });
    }
  };

  const updateTableData = (section: 'body' | 'head' | 'foot', newData: TableRow[]) => {
    updateContent({ [section]: newData });
  };

  const addRow = (section: 'body' | 'head' | 'foot') => {
    const currentData = section === 'body' ? body : section === 'head' ? head : foot;
    const columnCount = currentData[0]?.cells.length || 2;
    const newRow: TableRow = {
      cells: Array(columnCount).fill(null).map(() => ({ content: '', tag: section === 'head' ? 'th' : 'td' }))
    };
    updateTableData(section, [...currentData, newRow]);
  };

  const removeRow = (section: 'body' | 'head' | 'foot', index: number) => {
    const currentData = section === 'body' ? body : section === 'head' ? head : foot;
    updateTableData(section, currentData.filter((_, i) => i !== index));
  };

  const addColumn = () => {
    const newBody = body.map(row => ({
      ...row,
      cells: [...row.cells, { content: '', tag: 'td' as const }]
    }));
    const newHead = head.map(row => ({
      ...row,
      cells: [...row.cells, { content: '', tag: 'th' as const }]
    }));
    const newFoot = foot.map(row => ({
      ...row,
      cells: [...row.cells, { content: '', tag: 'td' as const }]
    }));
    updateContent({ body: newBody, head: newHead, foot: newFoot });
  };

  const removeColumn = (columnIndex: number) => {
    const newBody = body.map(row => ({
      ...row,
      cells: row.cells.filter((_, i) => i !== columnIndex)
    }));
    const newHead = head.map(row => ({
      ...row,
      cells: row.cells.filter((_, i) => i !== columnIndex)
    }));
    const newFoot = foot.map(row => ({
      ...row,
      cells: row.cells.filter((_, i) => i !== columnIndex)
    }));
    updateContent({ body: newBody, head: newHead, foot: newFoot });
  };

  const updateCell = (section: 'body' | 'head' | 'foot', rowIndex: number, cellIndex: number, content: string) => {
    const currentData = section === 'body' ? body : section === 'head' ? head : foot;
    const newData = currentData.map((row, rIdx) => {
      if (rIdx === rowIndex) {
        return {
          ...row,
          cells: row.cells.map((cell, cIdx) => {
            if (cIdx === cellIndex) {
              return { ...cell, content };
            }
            return cell;
          })
        };
      }
      return row;
    });
    updateTableData(section, newData);
  };

  const createTable = (rows: number, cols: number) => {
    const newBody: TableRow[] = Array(rows).fill(null).map(() => ({
      cells: Array(cols).fill(null).map(() => ({ content: '', tag: 'td' as const }))
    }));
    updateContent({ body: newBody, head: [], foot: [] });
  };

  // Initialize table if empty
  if (body.length === 0) {
    return (
      <div className="space-y-4">
        <CollapsibleCard title="Content" icon={TableIcon} defaultOpen={true}>
          <div>
            <SettingsLabel>Create Table</SettingsLabel>
            <div className="flex gap-2 items-center mt-2">
              <Button onClick={() => createTable(3, 3)} variant="outline" size="sm">3x3</Button>
              <Button onClick={() => createTable(4, 4)} variant="outline" size="sm">4x4</Button>
              <Button onClick={() => createTable(5, 3)} variant="outline" size="sm">5x3</Button>
            </div>
          </div>
        </CollapsibleCard>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Content Card */}
      <CollapsibleCard title="Content" icon={TableIcon} defaultOpen={true}>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={addColumn} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Column
            </Button>
            <Button onClick={() => addRow('body')} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Row
            </Button>
          </div>

          {/* Table Body Editor */}
          <div>
            <SettingsLabel>Table Body</SettingsLabel>
            <div className="border border-npb-border-default rounded p-2 space-y-2 max-h-64 overflow-y-auto">
              {body.map((row, rowIndex) => (
                <div key={rowIndex} className="flex items-center gap-1">
                  <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${row.cells.length}, 1fr)` }}>
                    {row.cells.map((cell, cellIndex) => (
                      <Input
                        key={cellIndex}
                        value={cell.content}
                        onChange={(e) => updateCell('body', rowIndex, cellIndex, e.target.value)}
                        placeholder={`R${rowIndex + 1}C${cellIndex + 1}`}
                        className="text-xs h-9"
                      />
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow('body', rowIndex)}
                    className="text-red-600 p-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SettingsLabel htmlFor="table-caption">Table Caption</SettingsLabel>
            <Input
              id="table-caption"
              value={tableData?.caption || ''}
              onChange={(e) => updateContent({ caption: e.target.value })}
              placeholder="Describe your table"
              className="mt-1 h-9"
            />
          </div>
        </div>
      </CollapsibleCard>

      {/* Settings Card */}
      <CollapsibleCard title="Settings" icon={Settings} defaultOpen={true}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="table-header">Header section</SettingsLabel>
            <Switch
              id="table-header"
              checked={head.length > 0}
              onCheckedChange={(checked) => {
                if (checked) {
                  const columnCount = body[0]?.cells.length || 2;
                  const newHead: TableRow[] = [{
                    cells: Array(columnCount).fill(null).map(() => ({ content: '', tag: 'th' as const }))
                  }];
                  updateContent({ head: newHead });
                } else {
                  updateContent({ head: [] });
                }
              }}
            />
          </div>

          {head.length > 0 && (
            <div>
              <SettingsLabel>Table Header</SettingsLabel>
              <div className="border border-npb-border-default rounded p-2 space-y-2 mt-1">
                {head.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex items-center gap-1">
                    <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${row.cells.length}, 1fr)` }}>
                      {row.cells.map((cell, cellIndex) => (
                        <Input
                          key={cellIndex}
                          value={cell.content}
                          onChange={(e) => updateCell('head', rowIndex, cellIndex, e.target.value)}
                          placeholder={`Header ${cellIndex + 1}`}
                          className="text-xs font-medium h-9"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="table-footer">Footer section</SettingsLabel>
            <Switch
              id="table-footer"
              checked={foot.length > 0}
              onCheckedChange={(checked) => {
                if (checked) {
                  const columnCount = body[0]?.cells.length || 2;
                  const newFoot: TableRow[] = [{
                    cells: Array(columnCount).fill(null).map(() => ({ content: '', tag: 'td' as const }))
                  }];
                  updateContent({ foot: newFoot });
                } else {
                  updateContent({ foot: [] });
                }
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="table-fixed">Fixed width table cells</SettingsLabel>
            <Switch
              id="table-fixed"
              checked={tableData?.hasFixedLayout || false}
              onCheckedChange={(checked) => updateContent({ hasFixedLayout: checked })}
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

const TableBlock: BlockDefinition = {
  id: 'core/table',
  label: 'Table',
  icon: TableIcon,
  description: 'Create a table to display data',
  category: 'advanced',
  defaultContent: {
    kind: 'structured',
    data: {
      head: [
        { cells: [{ content: 'Header 1', tag: 'th' }, { content: 'Header 2', tag: 'th' }, { content: 'Header 3', tag: 'th' }] },
      ],
      body: [
        { cells: [{ content: 'Cell 1', tag: 'td' }, { content: 'Cell 2', tag: 'td' }, { content: 'Cell 3', tag: 'td' }] },
        { cells: [{ content: 'Cell 4', tag: 'td' }, { content: 'Cell 5', tag: 'td' }, { content: 'Cell 6', tag: 'td' }] },
      ],
      foot: [],
      hasFixedLayout: false,
      caption: '',
      className: '',
    },
  },
  defaultStyles: {
    margin: '1em 0',
  },
  component: TableBlockComponent,
  settings: TableSettings,
  hasSettings: true,
};

export default TableBlock;
