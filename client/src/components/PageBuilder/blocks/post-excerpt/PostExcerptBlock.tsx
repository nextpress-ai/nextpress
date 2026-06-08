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

/** Build className string for the excerpt wrapper. */
function buildExcerptClassName(content: PostExcerptContent): string {
  return ['wp-block-post-excerpt', content?.className || '']
    .filter(Boolean)
    .join(' ');
}

// ============================================================================
// RENDERER
// ============================================================================

interface PostExcerptRendererProps {
  content: PostExcerptContent;
  styles?: React.CSSProperties;
}

/**
 * Pure presentational renderer for the post excerpt.
 * Renders static truncated text in both editor and preview mode.
 * Content is edited via the sidebar settings panel.
 */
function PostExcerptRenderer({ content, styles }: PostExcerptRendererProps) {
  const text = content?.text || '';
  const maxLength = content?.maxLength ?? DEFAULT_CONTENT.maxLength!;
  const showReadMore = content?.showReadMore ?? true;
  const readMoreText = content?.readMoreText || 'Read More';
  const className = buildExcerptClassName(content);

  const { truncated, wasTruncated } = truncateText(text, maxLength);

  return (
    <div className={className} style={styles}>
      <p className="wp-block-post-excerpt__excerpt">
        {truncated || 'Write your post excerpt...'}
      </p>
      {showReadMore && (
        <p className="wp-block-post-excerpt__more-link">
          <button type="button" onClick={(e) => e.preventDefault()} className="text-blue-600 hover:text-blue-800 underline">
            {readMoreText}
          </button>
        </p>
      )}
    </div>
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

  const currentMaxLength =
    content?.maxLength ?? DEFAULT_CONTENT.maxLength!;
  const currentShowReadMore = content?.showReadMore ?? true;
  const currentReadMoreText = content?.readMoreText || 'Read More';

  return (
    <div className="space-y-4">
      {/* Content */}
      <CollapsibleCard title="Content" icon={FileText} defaultOpen>
        <div>
          <SettingsLabel htmlFor="excerpt-text">Excerpt Text</SettingsLabel>
          <Textarea
            id="excerpt-text"
            value={content?.text || ''}
            onChange={(e) => updateContent({ text: e.target.value })}
            placeholder="Write the post excerpt..."
            rows={4}
            className="mt-1 text-sm resize-y"
          />
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
                {currentMaxLength} chars
              </span>
            </div>
            <Slider
              value={[currentMaxLength]}
              min={MAX_LENGTH_MIN}
              max={MAX_LENGTH_MAX}
              step={MAX_LENGTH_STEP}
              onValueChange={([val]) => updateContent({ maxLength: val })}
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
 * Content is edited via the sidebar settings panel.
 */
const PostExcerptBlock = createBlockDefinition<PostExcerptContent>({
  id: 'post/excerpt',
  label: 'Post Excerpt',
  icon: FileText,
  description: 'Display a summary excerpt of the post',
  category: 'post',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: { margin: '0 0 1em 0' },
  settings: PostExcerptSettings,
  hasSettings: true,
  render: ({ content, styles }) => <PostExcerptRenderer content={content} styles={styles} />,
});

export default PostExcerptBlock;
