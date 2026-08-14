import * as React from 'react';
import type { BlockConfig } from '@shared/schema-types';
import { OptionButton, OptionGroup, SettingsLabel } from '../../shared';
import { Input } from '@/components/ui/input';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Type, Settings } from 'lucide-react';
import { useSettingsState } from '../useSettingsState';
import { createBlockDefinition } from '../createBlockDefinition';
import { BlockShell } from '../shared/block-shell';
import { usePostDocument } from '../../PageContext';

// ============================================================================
// TYPES
// ============================================================================

export type PostTitleContent = {
  text?: string;
  tag?: 'h1' | 'h2' | 'h3';
  className?: string;
};

const DEFAULT_CONTENT: PostTitleContent = {
  text: 'Post Title',
  tag: 'h1',
  className: '',
};

const HEADING_TAG_OPTIONS = [
  { value: 'h1' as const, label: 'H1' },
  { value: 'h2' as const, label: 'H2' },
  { value: 'h3' as const, label: 'H3' },
] as const;

/** Same type scale as HeadingBlock — Tailwind preflight strips UA heading defaults. */
const POST_TITLE_TYPE: Record<NonNullable<PostTitleContent['tag']>, { fontSize: string; fontWeight: string }> = {
  h1: { fontSize: '2.5rem', fontWeight: '800' },
  h2: { fontSize: '2rem', fontWeight: '700' },
  h3: { fontSize: '1.75rem', fontWeight: '700' },
};

// ============================================================================
// RENDERER
// ============================================================================

interface PostTitleRendererProps {
  content: PostTitleContent;
  styles?: React.CSSProperties;
  onTextChange?: (text: string) => void;
}

/**
 * Pure presentational renderer for the post title.
 * Uses the post document title when the block still has the default placeholder.
 */
function PostTitleRenderer({ content, styles, onTextChange }: PostTitleRendererProps) {
  const postDocument = usePostDocument();
  const raw = content?.text || '';
  const text =
    raw && raw !== DEFAULT_CONTENT.text
      ? raw
      : postDocument?.title || raw || 'Post Title';
  const tag = content?.tag || 'h1';
  const mergedStyles: React.CSSProperties = {
    color: 'var(--npb-text-primary)',
    ...POST_TITLE_TYPE[tag],
    ...styles,
  };

  return (
    <BlockShell as={tag} blockClass="wp-block-post-title" className={content?.className} style={mergedStyles}>
      {onTextChange ? (
        <input
          aria-label="Post title"
          value={text}
          onChange={(e) => {
            const next = e.target.value;
            onTextChange(next);
            postDocument?.updateDocument({ title: next });
          }}
          className="w-full bg-transparent p-0 outline-none"
          style={{
            font: 'inherit',
            fontSize: 'inherit',
            fontWeight: 'inherit',
            color: 'inherit',
            lineHeight: 'inherit',
          }}
        />
      ) : (
        text
      )}
    </BlockShell>
  );
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface PostTitleSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

/**
 * Sidebar settings panel for the post title block.
 * Allows choosing the heading tag level (h1-h3) and adding custom CSS classes.
 */
function PostTitleSettings({ block, onUpdate }: PostTitleSettingsProps) {
  const { content, updateContent } = useSettingsState<PostTitleContent>({
    block,
    onUpdate,
    defaultContent: DEFAULT_CONTENT,
  });
  const postDocument = usePostDocument();

  const currentTag = content?.tag || 'h1';
  const titleValue =
    content?.text && content.text !== DEFAULT_CONTENT.text
      ? content.text
      : postDocument?.title || content?.text || '';

  const setTitle = (text: string) => {
    updateContent({ text });
    postDocument?.updateDocument({ title: text });
  };

  return (
    <div className="space-y-4">
      {/* Content */}
      <CollapsibleCard title="Content" icon={Type} defaultOpen>
        <div>
          <SettingsLabel htmlFor="post-title-text">Post title</SettingsLabel>
          <Input
            id="post-title-text"
            value={titleValue}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter the post title"
            className="mt-1 h-9 text-sm"
          />
        </div>
      </CollapsibleCard>

      {/* Heading Tag Level */}
      <CollapsibleCard title="Settings" icon={Settings} defaultOpen>
        <div className="space-y-3">
          <OptionGroup label="Heading Level">
            {HEADING_TAG_OPTIONS.map((option) => (
              <OptionButton
                key={option.value}
                isActive={currentTag === option.value}
                onClick={() => updateContent({ tag: option.value })}
                ariaLabel={`Use ${option.label} tag`}>
                {option.label}
              </OptionButton>
            ))}
          </OptionGroup>
        </div>
      </CollapsibleCard>
    </div>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

/**
 * Post Title block definition for the PageBuilder.
 * Renders the post title as a configurable heading element (h1/h2/h3).
 * In editor mode the title is inline-editable; in preview mode it renders
 * as a static heading.
 */
const PostTitleBlock = createBlockDefinition<PostTitleContent>({
  id: 'post/title',
  label: 'Post Title',
  icon: Type,
  description: 'Display the post title as a heading',
  category: 'post',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: { margin: '0' },
  settings: PostTitleSettings,
  hasSettings: true,
  render: ({ content, styles, setContent }) => (
    <PostTitleRenderer
      content={content}
      styles={styles}
      onTextChange={(text) => {
        setContent((prev) => ({ ...prev, text }));
      }}
    />
  ),
});

export default PostTitleBlock;
