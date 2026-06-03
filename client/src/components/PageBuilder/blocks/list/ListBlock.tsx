import React from "react";
import type { JSX } from "react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import type { BlockDefinition, BlockComponentProps } from "../types.ts";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { SettingsLabel } from '../../shared';
import { Settings, List as ListIcon } from "lucide-react";
import { getBlockStateAccessor } from "../blockStateRegistry";
import { useBlockState } from "../useBlockState";
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
    ...styles,
    // For unordered lists, map `type` to CSS list-style-type if present
    ...(listType && !isOrdered ? { listStyleType: listType as React.CSSProperties['listStyleType'] } : {}),
  };

  const commonProps: any = {
    style,
    ...(anchor ? { id: anchor } : {}),
    ...(className ? { className } : {}),
    dangerouslySetInnerHTML: { __html: sanitizeHtml(valuesHtml) },
  };

  // For ordered lists, support HTML attributes reversed/start and type
  if (isOrdered) {
    if (typeof start === 'number') commonProps.start = start;
    if (reversed) commonProps.reversed = true;
    // For ordered lists, `type` can be one of '1', 'a', 'A', 'i', 'I'
    if (listType && ['1', 'a', 'A', 'i', 'I'].includes(listType)) {
      commonProps.type = listType;
    }
  }

  return <ListTag {...commonProps} />;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ListBlockComponent({
  value,
  onChange,
}: BlockComponentProps) {
  const { content, styles } = useBlockState<ListContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
  });

  return <ListRenderer content={content} styles={styles} />;
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface ListSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function ListSettings({ block, onUpdate }: ListSettingsProps) {
  const accessor = getBlockStateAccessor(block.id);
  const [, setUpdateTrigger] = React.useState(0);

  // Get current state
  const content = accessor
    ? (accessor.getContent() as ListContent)
    : (block.content as ListContent) || DEFAULT_CONTENT;

  // Update handlers
  const updateContent = (updates: Partial<ListContent>) => {
    if (accessor) {
      const current = accessor.getContent() as ListContent;
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

const ListBlock: BlockDefinition = {
  id: 'core/list',
  label: 'List',
  icon: ListIcon,
  description: 'Add a bulleted or numbered list',
  category: 'advanced',
  defaultContent: {
    ordered: false,
    values: '<li>List item 1</li><li>List item 2</li><li>List item 3</li>',
    start: undefined,
    reversed: undefined,
    type: undefined,
    anchor: '',
    className: '',
  },
  defaultStyles: { margin: '1em 0' },
  component: ListBlockComponent,
  settings: ListSettings,
  hasSettings: true,
};

export default ListBlock;
