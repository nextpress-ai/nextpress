import React from "react";
import type { BlockDefinition, BlockComponentProps } from "../types.ts";
import { Table as TableIcon } from "lucide-react";
import { useBlockState } from "../useBlockState";
import { sanitizeHtml } from "../../utils";
import {
  type TableContent,
  type TableData,
  type TableRow,
  DEFAULT_DATA,
  DEFAULT_CONTENT,
} from "./table-model";
import { TableSettings } from "./table-settings";

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
