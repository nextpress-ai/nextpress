// blocks/post-excerpt/PostExcerptBlock.tsx
import * as React from 'react';
import type { BlockConfig } from '@shared/schema-types';
import { SettingsLabel } from '../../shared';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { FileText, Settings } from 'lucide-react';
import { useSettingsState } from '../useSettingsState';
import { createBlockDefinition } from '../createBlockDefinition';
import { BlockShell } from '../shared/block-shell';
import { usePostDocument } from '../../PageContext';

// ============================================================================
// TYPES
// ============================================================================

export type PostExcerptContent = {
  text?: string;
  maxLength?: number;
  showReadMore?: boolean;
  readMoreText?: string;
  className?: string;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONTENT: PostExcerptContent = {
  text: 'This is a brief summary of the post content that gives readers a preview of what to expect...',
  maxLength: 200,
  showReadMore: true,
  readMoreText: 'Read More',
  className: '',
};

const MAX_LENGTH_MIN = 50;
const MAX_LENGTH_MAX = 500;
const MAX_LENGTH_STEP = 10;

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Truncate text to a given character limit, breaking at the nearest word boundary.
 * Appends ellipsis when text is actually truncated.
 */
function truncateText(
  text: string,
  maxLength: number,
): { truncated: string; wasTruncated: boolean } {
  if (!text || text.length <= maxLength) {
    return { truncated: text || '', wasTruncated: false };
  }

  const sliced = text.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(' ');
  const breakpoint = lastSpace > 0 ? lastSpace : maxLength;

  return { truncated: sliced.slice(0, breakpoint) + '…', wasTruncated: true };
}

// ============================================================================
// RENDERER
// ============================================================================

interface PostExcerptRendererProps {
  content: PostExcerptContent;
  styles?: React.CSSProperties;
  onTextChange?: (text: string) => void;
}

/**
 * Pure presentational renderer for the post excerpt.
 * Editor canvas is inline-editable; preview shows the truncated summary.
 */
function PostExcerptRenderer({ content, styles, onTextChange }: PostExcerptRendererProps) {
  const postDocument = usePostDocument();
  const raw = content?.text || '';
  const text =
    raw && raw !== DEFAULT_CONTENT.text
      ? raw
      : postDocument?.excerpt || raw;
  const maxLength = content?.maxLength ?? DEFAULT_CONTENT.maxLength!;
  const showReadMore = content?.showReadMore ?? true;
  const readMoreText = content?.readMoreText || 'Read More';

  const { truncated } = truncateText(text, maxLength);

  return (
    <BlockShell blockClass="wp-block-post-excerpt" className={content?.className} style={styles}>
      {onTextChange ? (
        <textarea
          aria-label="Post excerpt"
          value={text}
          maxLength={maxLength}
          rows={3}
          onChange={(e) => {
            const next = e.target.value.slice(0, maxLength);
            onTextChange(next);
            postDocument?.updateDocument({ excerpt: next });
          }}
          placeholder="Write your post excerpt..."
          className="wp-block-post-excerpt__excerpt w-full resize-y bg-transparent p-0 outline-none"
          style={{ font: 'inherit', color: 'inherit', lineHeight: 'inherit' }}
        />
      ) : (
        <p className="wp-block-post-excerpt__excerpt">
          {truncated || 'Write your post excerpt...'}
        </p>
      )}
      {showReadMore && (
        <p className="wp-block-post-excerpt__more-link">
          <button type="button" onClick={(e) => e.preventDefault()} className="text-blue-600 hover:text-blue-800 underline">
            {readMoreText}
          </button>
        </p>
      )}
    </BlockShell>
  );
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface PostExcerptSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

/**
 * Sidebar settings panel for the post excerpt block.
 * Controls max character length, "Read More" toggle/text, and CSS classes.
 */
function PostExcerptSettings({ block, onUpdate }: PostExcerptSettingsProps) {
  const { content, updateContent } = useSettingsState<PostExcerptContent>({
    block,
    onUpdate,
    defaultContent: DEFAULT_CONTENT,
  });
  const postDocument = usePostDocument();

  const currentMaxLength =
    content?.maxLength ?? DEFAULT_CONTENT.maxLength!;
  const currentShowReadMore = content?.showReadMore ?? true;
  const currentReadMoreText = content?.readMoreText || 'Read More';
  const rawExcerptText =
    content?.text && content.text !== DEFAULT_CONTENT.text
      ? content.text
      : postDocument?.excerpt || content?.text || '';
  const excerptText =
    rawExcerptText.length > currentMaxLength
      ? rawExcerptText.slice(0, currentMaxLength)
      : rawExcerptText;

  const setMaxLength = (nextMaxLength: number) => {
    updateContent({
      maxLength: nextMaxLength,
      ...(rawExcerptText.length > nextMaxLength
        ? { text: rawExcerptText.slice(0, nextMaxLength) }
        : {}),
    });
  };

  return (
    <div className="space-y-4">
      {/* Content */}
      <CollapsibleCard title="Content" icon={FileText} defaultOpen>
        <div>
          <SettingsLabel htmlFor="excerpt-text">Excerpt Text</SettingsLabel>
          <Textarea
            id="excerpt-text"
            value={excerptText}
            maxLength={currentMaxLength}
            onChange={(e) => {
              const text = e.target.value.slice(0, currentMaxLength);
              updateContent({ text });
              postDocument?.updateDocument({ excerpt: text });
            }}
            placeholder="Write the post excerpt..."
            rows={4}
            className="mt-1 text-sm resize-y"
            aria-describedby="excerpt-text-count"
          />
          <p
            id="excerpt-text-count"
            className="mt-1 text-xs tabular-nums text-npb-text-muted">
            {excerptText.length} / {currentMaxLength} characters
          </p>
        </div>
      </CollapsibleCard>

      {/* Excerpt Settings */}
      <CollapsibleCard title="Settings" icon={Settings} defaultOpen>
        <div className="space-y-4">
          {/* Max Length Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
            <SettingsLabel>Max Length</SettingsLabel>
              <span className="text-xs text-npb-text-muted">
                {currentMaxLength} characters
              </span>
            </div>
            <Slider
              value={[currentMaxLength]}
              min={MAX_LENGTH_MIN}
              max={MAX_LENGTH_MAX}
              step={MAX_LENGTH_STEP}
              onValueChange={([val]) => {
                if (typeof val === 'number') setMaxLength(val);
              }}
            />
          </div>

          {/* Show Read More Toggle */}
          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="show-read-more">Show "Read More"</SettingsLabel>
            <Switch
              id="show-read-more"
              checked={currentShowReadMore}
              onCheckedChange={(checked) =>
                updateContent({ showReadMore: checked })
              }
            />
          </div>

          {/* Read More Text Input (visible only when toggle is on) */}
          {currentShowReadMore && (
            <div>
            <SettingsLabel htmlFor="read-more-text">Read More Text</SettingsLabel>
              <Input
                id="read-more-text"
                value={currentReadMoreText}
                onChange={(e) =>
                  updateContent({ readMoreText: e.target.value })
                }
                placeholder="Read More"
                className="mt-1 h-9 text-sm"
              />
            </div>
          )}
        </div>
      </CollapsibleCard>
    </div>
  );
}

// BLOCK DEFINITION

/**
 * Post Excerpt block definition for the PageBuilder.
 * Displays a configurable post excerpt with truncation and optional "Read More" link.
 * Content is edited on the canvas or in the sidebar.
 */
const PostExcerptBlock = createBlockDefinition<PostExcerptContent>({
  id: 'post/excerpt',
  label: 'Post Excerpt',
  icon: FileText,
  description: 'Display a summary excerpt of the post',
  category: 'post',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: { margin: '0' },
  settings: PostExcerptSettings,
  hasSettings: true,
  render: ({ content, styles, setContent, isPreview }) => (
    <PostExcerptRenderer
      content={content}
      styles={styles}
      onTextChange={
        isPreview
          ? undefined
          : (text) => {
              setContent((prev) => ({ ...prev, text }));
            }
      }
    />
  ),
});

export default PostExcerptBlock;
