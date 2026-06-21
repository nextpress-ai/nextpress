import React from "react";
import type { JSX } from "react";
import type { BlockConfig } from "@shared/schema-types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { SettingsLabel } from '../../shared';
import { Settings, List as ListIcon } from "lucide-react";
import { createBlockDefinition } from "../createBlockDefinition";
import { BlockShell } from "../shared/block-shell";
import { useSettingsState } from "../useSettingsState";
import { sanitizeHtml } from "../../utils";

// ============================================================================
// TYPES
// ============================================================================

type ListContent = {
  ordered?: boolean;
  values?: string;
  items?: string[];
  start?: number;
  reversed?: boolean;
  type?: string;
  anchor?: string;
  className?: string;
};

const DEFAULT_CONTENT: ListContent = {
  ordered: false,
  values: '<li>List item 1</li><li>List item 2</li><li>List item 3</li>',
  start: undefined,
  reversed: undefined,
  type: undefined,
  anchor: '',
  className: '',
};

// ============================================================================
// RENDERER
// ============================================================================

interface ListRendererProps {
  content: ListContent;
  styles?: React.CSSProperties;
}

function ListRenderer({ content, styles }: ListRendererProps) {
  const isOrdered = !!content?.ordered;
  const ListTag = (isOrdered ? 'ol' : 'ul') as keyof JSX.IntrinsicElements;
  // Back-compat: if legacy `items` array exists and no `values`, build HTML from it
  const legacyItems: string[] | undefined = content?.items;
  const valuesHtml: string =
    (content?.values as string | undefined)?.trim() ||
    (Array.isArray(legacyItems)
      ? legacyItems
          .filter((it) => typeof it === 'string' && it.trim().length > 0)
          .map((it) => `<li>${it}</li>`)
          .join('')
      : '<li>List item 1</li><li>List item 2</li><li>List item 3</li>');

  // Map Gutenberg-like attributes
  const anchor: string | undefined = content?.anchor;
  const className: string | undefined = content?.className;
  const reversed: boolean | undefined = isOrdered ? content?.reversed : undefined;
  const start: number | undefined = isOrdered ? content?.start : undefined;
  const listType: string | undefined = content?.type;

  const style: React.CSSProperties = {
    // Restore default markers + indent (global CSS reset strips them). Kept in
    // sync with the SSR list renderer so preview and publish match.
    listStyleType: isOrdered ? 'decimal' : 'disc',
    paddingLeft: '1.5em',
    ...styles,
    // For unordered lists, map `type` to CSS list-style-type if present
    ...(listType && !isOrdered ? { listStyleType: listType as React.CSSProperties['listStyleType'] } : {}),
  };

  const commonProps = {
    style,
    ...(anchor ? { id: anchor } : {}),
    dangerouslySetInnerHTML: { __html: sanitizeHtml(valuesHtml) },
  };

  // For ordered lists, support HTML attributes reversed/start and type
  if (isOrdered) {
    if (typeof start === 'number') (commonProps as Record<string, unknown>).start = start;
    if (reversed) (commonProps as Record<string, unknown>).reversed = true;
    if (listType && ['1', 'a', 'A', 'i', 'I'].includes(listType)) {
      (commonProps as Record<string, unknown>).type = listType;
    }
  }

  return (
    <BlockShell
      as={ListTag}
      blockClass="wp-block-list"
      className={className}
      {...commonProps}
    />
  );
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface ListSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function ListSettings({ block, onUpdate }: ListSettingsProps) {
  const { content, updateContent } = useSettingsState<ListContent>({
    block,
    onUpdate,
    defaultContent: DEFAULT_CONTENT,
  });

  const isOrdered = !!content?.ordered;
  const values: string = content?.values || '';
  // Provide a simple textarea UX: one line per list item
  const itemsText: string = values
    ? values
        .split(/<\/li>/i)
        .map((chunk) => chunk.replace(/<li>/i, '').trim())
        .filter((line) => line.length > 0)
        .join('\n')
    : (content?.items as string[] | undefined)?.join('\n') || '';

  return (
    <div className="space-y-4">
      <CollapsibleCard title="Content" icon={ListIcon} defaultOpen={true}>
        <div className="space-y-2">
          <SettingsLabel htmlFor="list-items">Items (one per line)</SettingsLabel>
          <Textarea
            id="list-items"
            aria-label="List items, one per line"
            className="h-36"
            value={itemsText}
            onChange={(e) => {
              const lines = e.target.value.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
              const html = lines.map((l) => `<li>${sanitizeHtml(l)}</li>`).join('');
              updateContent({ values: html });
            }}
            placeholder={`List item 1\nList item 2\nList item 3`}
            rows={6}
          />
        </div>
      </CollapsibleCard>
      <CollapsibleCard title="List options" icon={Settings} defaultOpen={true}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <SettingsLabel htmlFor="list-type">List Type</SettingsLabel>
            <Select
              value={isOrdered ? 'ordered' : 'unordered'}
              onValueChange={(value) => updateContent({ ordered: value === 'ordered' })}
            >
              <SelectTrigger id="list-type" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unordered">Bulleted</SelectItem>
                <SelectItem value="ordered">Numbered</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isOrdered ? (
            <div className="space-y-2">
              <SettingsLabel htmlFor="list-start">Start</SettingsLabel>
              <Input
                type="number"
                className="h-9"
                value={content?.start ?? ''}
                onChange={(e) => updateContent({ start: e.target.value === '' ? undefined : Number(e.target.value) })}
                placeholder="1"
                id="list-start"
                aria-label="Start number for ordered list"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <SettingsLabel htmlFor="list-type-unordered">Bullet Style</SettingsLabel>
              <Select
                value={content?.type ?? 'default'}
                onValueChange={(value) => updateContent({ type: value === 'default' ? undefined : value })}
              >
                <SelectTrigger id="list-type-unordered" className="h-9">
                  <SelectValue placeholder="Default (disc)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default (disc)</SelectItem>
                  <SelectItem value="disc">disc</SelectItem>
                  <SelectItem value="circle">circle</SelectItem>
                  <SelectItem value="square">square</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {isOrdered && (
            <div className="space-y-2">
              <SettingsLabel htmlFor="list-reversed">Reversed</SettingsLabel>
              <div className="flex items-center gap-2">
                <Switch
                  id="list-reversed"
                  checked={!!content?.reversed}
                  onCheckedChange={(val) => updateContent({ reversed: val })}
                  aria-label="Reverse order"
                />
              </div>
            </div>
          )}
          {isOrdered && (
            <div className="space-y-2">
              <SettingsLabel htmlFor="list-type-ordered">Numbering Type</SettingsLabel>
              <Select
                value={content?.type ?? 'default'}
                onValueChange={(value) => updateContent({ type: value === 'default' ? undefined : value })}
              >
                <SelectTrigger id="list-type-ordered" className="h-9">
                  <SelectValue placeholder="Default (1,2,3)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default (1,2,3)</SelectItem>
                  <SelectItem value="1">1,2,3</SelectItem>
                  <SelectItem value="a">a,b,c</SelectItem>
                  <SelectItem value="A">A,B,C</SelectItem>
                  <SelectItem value="i">i,ii,iii</SelectItem>
                  <SelectItem value="I">I,II,III</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CollapsibleCard>
    </div>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const ListBlock = createBlockDefinition<ListContent>({
  id: 'core/list',
  label: 'List',
  icon: ListIcon,
  description: 'Add a bulleted or numbered list',
  category: 'advanced',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: { margin: '1em 0' },
  settings: ListSettings,
  hasSettings: true,
  render: ({ content, styles }) => <ListRenderer content={content} styles={styles} />,
});

export default ListBlock;
