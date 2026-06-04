import * as React from 'react';
import type { BlockDefinition, BlockComponentProps } from '../types.ts';
import type { BlockConfig } from '@shared/schema-types';
import { OptionButton, OptionGroup, SettingsLabel } from '../../shared';
import { Input } from '@/components/ui/input';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Type, Settings } from 'lucide-react';
import { useSettingsState } from '../useSettingsState';
import { useBlockState } from '../useBlockState';

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

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Build className string for the post title element.
 */
function buildTitleClassName(content: PostTitleContent): string {
  return ['wp-block-post-title', content?.className || '']
    .filter(Boolean)
    .join(' ');
}

// ============================================================================
// RENDERER
// ============================================================================

interface PostTitleRendererProps {
  content: PostTitleContent;
  styles?: React.CSSProperties;
}

/**
 * Pure presentational renderer for the post title.
 * Renders a static heading element in both editor and preview mode.
 * Content is edited via the sidebar settings panel.
 */
function PostTitleRenderer({ content, styles }: PostTitleRendererProps) {
  const text = content?.text || 'Post Title';
  const tag = content?.tag || 'h1';
  const className = buildTitleClassName(content);

  return React.createElement(tag, { className, style: styles }, text);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PostTitleComponent({ value, onChange }: BlockComponentProps) {
  const { content, styles } = useBlockState<PostTitleContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
  });

  return <PostTitleRenderer content={content} styles={styles} />;
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

  const currentTag = content?.tag || 'h1';

  return (
    <div className="space-y-4">
      {/* Content */}
      <CollapsibleCard title="Content" icon={Type} defaultOpen>
        <div>
          <SettingsLabel htmlFor="post-title-text">Title Text</SettingsLabel>
          <Input
            id="post-title-text"
            value={content?.text || ''}
            onChange={(e) => updateContent({ text: e.target.value })}
            placeholder="Enter post title"
            className="mt-1 h-9 text-sm"
          />
        </div>
      </CollapsibleCard>

      {/* Heading Tag Level */}
      <CollapsibleCard title="Settings" icon={Settings} defaultOpen>
        <div className="space-y-3">
          <SettingsLabel>Heading Level</SettingsLabel>
          <OptionGroup>
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
const PostTitleBlock: BlockDefinition = {
  id: 'post/title',
  label: 'Post Title',
  icon: Type,
  description: 'Display the post title as a heading',
  category: 'post',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: { margin: '0 0 1em 0' },
  component: PostTitleComponent,
  settings: PostTitleSettings,
  hasSettings: true,
};

export default PostTitleBlock;
