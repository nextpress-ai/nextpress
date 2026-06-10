import * as React from 'react';
import { ListOrdered, Settings, Type } from 'lucide-react';
import type { BlockDefinition, BlockComponentProps } from '../types.ts';
import type { BlockConfig } from '@shared/schema-types';
import { SettingsLabel } from '../../shared';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSettingsState } from '../useSettingsState';
import { useBlockState } from '../useBlockState';
import { defaultParseContent, defaultSerializeContent } from '../createBlockDefinition';

// ============================================================================
// TYPES
// ============================================================================

export type PostTocContent = {
  title?: string;
  maxDepth?: number;
  ordered?: boolean;
  className?: string;
};

type HeadingEntry = {
  id: string;
  text: string;
  level: number;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONTENT: PostTocContent = {
  title: 'Table of Contents',
  maxDepth: 3,
  ordered: false,
  className: '',
};

const DEPTH_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

/** Sample entries shown in the editor when live headings aren't available. */
const PLACEHOLDER_HEADINGS: HeadingEntry[] = [
  { id: 'intro', text: 'Introduction', level: 1 },
  { id: 'getting-started', text: 'Getting Started', level: 2 },
  { id: 'prerequisites', text: 'Prerequisites', level: 3 },
  { id: 'overview', text: 'Overview', level: 2 },
  { id: 'conclusion', text: 'Conclusion', level: 1 },
];

// ============================================================================
// UTILITIES
// ============================================================================

/** Build a heading selector string like "h1, h2, h3" up to maxDepth. */
function buildHeadingSelector(maxDepth: number): string {
  return Array.from({ length: maxDepth }, (_, i) => `h${i + 1}`).join(', ');
}

/**
 * Scan the page DOM for heading elements and return structured entries.
 * Filters to the given maxDepth and derives anchor IDs from the element id
 * or text content.
 */
function collectPageHeadings(maxDepth: number): HeadingEntry[] {
  const selector = buildHeadingSelector(maxDepth);
  const nodes = document.querySelectorAll(selector);
  const entries: HeadingEntry[] = [];

  nodes.forEach((node) => {
    const text = (node.textContent || '').trim();
    if (!text) return;

    const level = Number.parseInt(node.tagName.charAt(1), 10);
    const id =
      node.id ||
      text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    entries.push({ id, text, level });
  });

  return entries;
}

/**
 * Compute a hierarchical numbering label for a heading entry
 * (e.g. "1", "1.1", "2.1.1") based on its position in the list.
 */
function computeNumbering(entries: HeadingEntry[]): string[] {
  const counters: number[] = [];
  return entries.map((entry) => {
    const depth = entry.level;
    // Grow counters array to match depth
    while (counters.length < depth) counters.push(0);
    // Shrink counters when going back up to a shallower level
    counters.length = depth;
    counters[depth - 1] = (counters[depth - 1] || 0) + 1;
    return counters.join('.');
  });
}

/**
 * Indent padding in rem per heading depth level.
 * level 1 = 0, level 2 = 1rem, level 3 = 2rem, etc.
 */
function indentForLevel(level: number): string {
  return `${(level - 1) * 1}rem`;
}

// ============================================================================
// RENDERER
// ============================================================================

interface PostTocRendererProps {
  content: PostTocContent;
  styles?: React.CSSProperties;
  isPreview?: boolean;
}

/**
 * Pure presentational renderer for the Table of Contents block.
 * In preview mode, scans the live DOM for headings.
 * In editor mode, renders static placeholder entries.
 */
function PostTocRenderer({ content, styles, isPreview }: PostTocRendererProps) {
  const [headings, setHeadings] = React.useState<HeadingEntry[]>([]);
  const maxDepth = content?.maxDepth ?? 3;
  const ordered = content?.ordered ?? false;
  const title = content?.title ?? '';

  // In preview mode, scan the DOM for real headings
  React.useEffect(() => {
    if (!isPreview) return;

    const entries = collectPageHeadings(maxDepth);
    setHeadings(entries);
  }, [isPreview, maxDepth]);

  const entries = isPreview
    ? headings
    : PLACEHOLDER_HEADINGS.filter((h) => h.level <= maxDepth);
  const numbering = computeNumbering(entries);
  const ListTag = ordered ? 'ol' : 'ul';

  const containerClassName = ['wp-block-post-toc', content?.className || '']
    .filter(Boolean)
    .join(' ');

  return (
    <nav
      className={containerClassName}
      style={{
        border: '1px solid var(--npb-border-default)',
        borderRadius: 'var(--npb-radius-input)',
        padding: '1.25rem 1.5rem',
        backgroundColor: 'var(--npb-surface-raised)',
        ...styles,
      }}
      aria-label="Table of contents">
      {title && (
        <p className="font-semibold text-sm mb-3 text-npb-text-primary">
          {title}
        </p>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-npb-text-muted italic">
          No headings found.
        </p>
      ) : (
        <ListTag style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {entries.map((entry, idx) => (
            <li
              key={`${entry.id}-${idx}`}
              style={{
                paddingLeft: indentForLevel(entry.level),
                marginBottom: '0.35rem',
              }}>
              {isPreview ? (
                <a
                  href={`#${entry.id}`}
                  className="text-npb-accent no-underline text-sm hover:underline">
                  {ordered ? `${numbering[idx]} ` : ''}
                  {entry.text}
                </a>
              ) : (
                <span className="text-sm text-npb-text-secondary">
                  {ordered ? `${numbering[idx]} ` : '• '}
                  {entry.text}
                </span>
              )}
            </li>
          ))}
        </ListTag>
      )}
    </nav>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PostTocComponent({
  value,
  onChange,
  isPreview,
}: BlockComponentProps) {
  const { content, styles } = useBlockState<PostTocContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
    parseContent: defaultParseContent,
    serializeContent: defaultSerializeContent,
  });

  return (
    <PostTocRenderer content={content} styles={styles} isPreview={isPreview} />
  );
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface PostTocSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

/**
 * Sidebar settings panel for the Table of Contents block.
 * Exposes title, max heading depth, ordered/unordered toggle, and CSS class.
 */
function PostTocSettings({ block, onUpdate }: PostTocSettingsProps) {
  const { content, updateContent } = useSettingsState<PostTocContent>({
    block,
    onUpdate,
    defaultContent: DEFAULT_CONTENT,
    parseContent: defaultParseContent,
    serializeContent: defaultSerializeContent,
  });

  return (
    <div className="space-y-4">
      {/* Content Section */}
      <CollapsibleCard title="Content" icon={Type} defaultOpen>
        <div>
          <SettingsLabel htmlFor="toc-title">Title</SettingsLabel>
          <Input
            id="toc-title"
            aria-label="TOC title"
            value={content?.title ?? ''}
            onChange={(e) => updateContent({ title: e.target.value })}
            placeholder='e.g. "Table of Contents"'
            className="mt-1 h-9 text-sm"
          />
        </div>
      </CollapsibleCard>

      {/* Display Settings */}
      <CollapsibleCard title="Settings" icon={Settings} defaultOpen>
        <div className="space-y-4">
          {/* Max Depth */}
          <div>
            <SettingsLabel htmlFor="toc-depth">Max Heading Depth</SettingsLabel>
            <Select
              value={String(content?.maxDepth ?? 3)}
              onValueChange={(val) => updateContent({ maxDepth: Number(val) })}>
              <SelectTrigger id="toc-depth" className="mt-1 h-9 text-sm">
                <SelectValue placeholder="Select depth" />
              </SelectTrigger>
              <SelectContent>
                {DEPTH_OPTIONS.map((depth) => (
                  <SelectItem key={depth} value={String(depth)}>
                    H1{depth > 1 ? ` – H${depth}` : ' only'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ordered Toggle */}
          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="toc-ordered">Numbered List</SettingsLabel>
            <Switch
              id="toc-ordered"
              checked={content?.ordered ?? false}
              onCheckedChange={(checked) => updateContent({ ordered: checked })}
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

/**
 * Post Table of Contents block definition for the PageBuilder.
 * Auto-generates a navigable TOC from heading elements on the page.
 * In preview mode it scans the DOM for headings; in editor mode it
 * displays sample placeholder entries.
 */
const PostTocBlock: BlockDefinition = {
  id: 'post/toc',
  label: 'Table of Contents',
  icon: ListOrdered,
  description: 'Auto-generated table of contents from page headings',
  category: 'post',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: { margin: '1em 0' },
  component: PostTocComponent,
  settings: PostTocSettings,
  hasSettings: true,
  parseContent: defaultParseContent,
  serializeContent: defaultSerializeContent,
};

export default PostTocBlock;
