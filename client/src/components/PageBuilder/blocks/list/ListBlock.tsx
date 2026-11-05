import React, { useState } from "react";
import type { JSX } from "react";
import type { BlockConfig } from "@shared/schema-types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { SettingsLabel } from '../../shared';
import { List as ListIcon } from "lucide-react";
import { createBlockDefinition } from "../createBlockDefinition";
import { BlockShell } from "../shared/block-shell";
import { InlineTextEditor } from "../shared/inline-text-editor";
import { inlineMarkdown } from "@shared/content-text/html-text";
import { inlineMarkdownToHtml } from "@shared/markdown/inline-html";
import { leaveList } from "../../docs-mode/docs-writing";
import { useWriting } from "../../writing/writing-context";
import { generateBlockId } from "../../utils";
import { useSettingsState } from "../useSettingsState";
import { SettingsChipGroup } from "../../settings-chip-group";
import { sanitizeHtml } from "../../utils";
import { LIST_DEFAULT_CONTENT } from "@shared/block-catalog/text-blocks";
import { readListMarker, type ListMarker } from "@shared/blocks/list-markers-css";
import { catalogMeta } from "../catalog-meta";

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
  /** Bullet shape for unordered lists; "default" keeps the browser's bullets. */
  marker?: string;
  anchor?: string;
  className?: string;
};

const DEFAULT_CONTENT: ListContent = LIST_DEFAULT_CONTENT;

const LIST_KIND_OPTIONS = [
  { value: "unordered", label: "Bullets" },
  { value: "ordered", label: "Numbers" },
];

const LIST_MARKER_OPTIONS: { value: ListMarker; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "check", label: "Check" },
  { value: "arrow", label: "Arrow" },
  { value: "dash", label: "Dash" },
  { value: "none", label: "None" },
];

/** Custom markers replace the browser's bullet, so the list's own bullet style no longer applies. */
function readCustomMarker({ ordered, marker }: { ordered: boolean; marker?: string }): ListMarker | null {
  const value = readListMarker(marker);
  return !ordered && value !== "default" ? value : null;
}

/**
 * WHY: Enter must keep a blank line while the field is focused. Saved HTML
 * only stores non-empty items, so the field reads a draft until blur.
 */
function createListItemsDraft({
  savedText,
  draft,
  setDraft,
  lineToHtml = sanitizeHtml,
}: {
  savedText: string;
  draft: string | null;
  setDraft: (next: string | null) => void;
  /** How one typed line is saved inside its `<li>`; docs and posts read it as inline markdown. */
  lineToHtml?: (line: string) => string;
}): {
  fieldValue: string;
  onFocus: () => void;
  onBlur: () => void;
  onTextChange: (text: string) => string;
} {
  return {
    fieldValue: draft ?? savedText,
    onFocus: () => {
      if (draft === null) setDraft(savedText);
    },
    onBlur: () => {
      setDraft(null);
    },
    onTextChange: (text: string) => {
      setDraft(text);
      return text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => `<li>${lineToHtml(line)}</li>`)
        .join("");
    },
  };
}

function readBulletStyle({ type }: { type?: string }): "disc" | "circle" | "square" {
  if (type === "circle" || type === "square") return type;
  return "disc";
}

function ListCanvasItemsEditor({
  blockId,
  itemsText,
  onUpdateContent,
}: {
  blockId?: string;
  itemsText: string;
  onUpdateContent?: (updates: Partial<ListContent>) => void;
}): JSX.Element {
  const writing = useWriting();
  // In an editor that writes (docs, posts) a list made by typing "- " opens focused, and Enter on an empty line leaves it.
  const [caret] = useState(() => (writing && blockId ? writing.takeCaret(blockId) ?? undefined : undefined));
  const [itemsDraft, setItemsDraft] = useState<string | null>(null);
  // In an editor that writes, items are typed as inline markdown (**bold**, `code`, [links](url)) and saved as HTML.
  const field = createListItemsDraft({
    savedText: writing ? itemsText.split("\n").map((line) => inlineMarkdown(line)).join("\n") : itemsText,
    draft: itemsDraft,
    setDraft: setItemsDraft,
    ...(writing ? { lineToHtml: inlineMarkdownToHtml } : {}),
  });

  return (
    <InlineTextEditor
      value={field.fieldValue}
      onChange={(text) => {
        onUpdateContent?.({ values: field.onTextChange(text), items: undefined });
      }}
      onFocus={field.onFocus}
      onBlur={field.onBlur}
      focusAt={caret}
      onKeyDown={(event) => {
        if (!writing || !blockId || event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
        const el = event.currentTarget;
        const onEmptyLine = el.selectionStart === el.value.length && (el.value === "" || el.value.endsWith("\n"));
        if (!onEmptyLine) return;
        event.preventDefault();
        const result = leaveList({ blocks: writing.getBlocks(), blockId, newId: generateBlockId });
        if (result) writing.applyWriting(result);
      }}
      style={{ color: "inherit", fontSize: "inherit", lineHeight: "inherit" }}
      multiline
      placeholder={"List item 1\nList item 2\nList item 3"}
    />
  );
}

// ============================================================================
// RENDERER
// ============================================================================

interface ListRendererProps {
  content: ListContent;
  styles?: React.CSSProperties;
  isEditing?: boolean;
  blockId?: string;
  onUpdateContent?: (updates: Partial<ListContent>) => void;
}

function ListRenderer({
  content,
  styles,
  isEditing,
  blockId,
  onUpdateContent,
}: ListRendererProps) {
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
  const reversed: boolean | undefined = isOrdered ? content?.reversed : undefined;
  const start: number | undefined = isOrdered ? content?.start : undefined;
  const listType: string | undefined = content?.type;
  const customMarker = readCustomMarker({ ordered: isOrdered, marker: content?.marker });
  // Custom markers draw their own indent and bullet in CSS, so the inline defaults step aside.
  const markerClass = customMarker ? `np-list--${customMarker}` : undefined;
  const className = [content?.className, markerClass].filter(Boolean).join(" ") || undefined;

  const style: React.CSSProperties = {
    // Restore default markers + indent (global CSS reset strips them). Kept in
    // sync with the SSR list renderer so preview and publish match.
    ...(customMarker ? {} : { listStyleType: isOrdered ? 'decimal' : 'disc', paddingLeft: '1.5em' }),
    ...styles,
    // For unordered lists, map `type` to CSS list-style-type if present
    ...(listType && !isOrdered && !customMarker ? { listStyleType: listType as React.CSSProperties['listStyleType'] } : {}),
  };

  const commonProps = {
    style,
    ...(anchor ? { id: anchor } : {}),
    dangerouslySetInnerHTML: { __html: sanitizeHtml(valuesHtml) },
  };

  if (isEditing) {
    const itemsText: string = valuesHtml
      ? valuesHtml
          .split(/<\/li>/i)
          .map((chunk) => chunk.replace(/<li>/i, '').trim())
          .filter((line) => line.length > 0)
          .join('\n')
      : '';
    return (
      <BlockShell
        as={ListTag}
        blockClass="wp-block-list"
        className={className}
        style={style}
      >
        <ListCanvasItemsEditor
          blockId={blockId}
          itemsText={itemsText}
          onUpdateContent={onUpdateContent}
        />
      </BlockShell>
    );
  }

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

  const [itemsDraft, setItemsDraft] = useState<string | null>(null);
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
  const itemsField = createListItemsDraft({
    savedText: itemsText,
    draft: itemsDraft,
    setDraft: setItemsDraft,
  });

  return (
    <div className="space-y-4">
      <CollapsibleCard title="Content" icon={ListIcon} defaultOpen={true}>
        <div className="space-y-2">
          <SettingsLabel htmlFor="list-items">Items (one per line)</SettingsLabel>
          <Textarea
            id="list-items"
            aria-label="List items, one per line"
            className="h-36"
            value={itemsField.fieldValue}
            onChange={(e) => {
              updateContent({ values: itemsField.onTextChange(e.target.value) });
            }}
            onFocus={itemsField.onFocus}
            onBlur={itemsField.onBlur}
            placeholder={`List item 1\nList item 2\nList item 3`}
            rows={6}
          />
        </div>
        <div className="space-y-4">
          <SettingsChipGroup
            label="List Type"
            ariaLabel="List Type"
            options={LIST_KIND_OPTIONS}
            value={isOrdered ? "ordered" : "unordered"}
            onChange={(value) => updateContent({ ordered: value === "ordered" })}
          />
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
            <>
              <SettingsChipGroup
                label="Marker"
                ariaLabel="List marker"
                options={LIST_MARKER_OPTIONS}
                value={readListMarker(content?.marker)}
                onChange={(value) => updateContent({ marker: value === "default" ? undefined : value })}
              />
              {/* Bullet Style only changes the browser's own bullet, so it hides when a custom marker is set. */}
              {!readCustomMarker({ ordered: false, marker: content?.marker }) && (
                <div className="space-y-2">
                  <SettingsLabel htmlFor="list-type-unordered">Bullet Style</SettingsLabel>
                  <Select
                    value={readBulletStyle({ type: content?.type })}
                    onValueChange={(value) =>
                      updateContent({ type: value === "disc" ? undefined : value })
                    }
                  >
                    <SelectTrigger id="list-type-unordered" className="h-9">
                      <SelectValue placeholder="Dot" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disc">Dot</SelectItem>
                      <SelectItem value="circle">Circle</SelectItem>
                      <SelectItem value="square">Square</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
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
                value={content?.type ?? '1'}
                onValueChange={(value) => updateContent({ type: value === '1' ? undefined : value })}
              >
                <SelectTrigger id="list-type-ordered" className="h-9">
                  <SelectValue placeholder="Default (1,2,3)" />
                </SelectTrigger>
                <SelectContent>
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
  ...catalogMeta('core/list'),
  icon: ListIcon,
  defaultContent: DEFAULT_CONTENT,
  settings: ListSettings,
  hasSettings: true,
  render: ({ value, content, styles, isEditing, setContent }) => (
    <ListRenderer
      blockId={value.id}
      content={content}
      styles={styles}
      isEditing={isEditing}
      onUpdateContent={(updates) => setContent((prev) => ({ ...prev, ...updates }))}
    />
  ),
});

export default ListBlock;
