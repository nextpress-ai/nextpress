import React, { useState } from 'react';
import type { BlockConfig } from '@shared/schema-types';
import { SettingsLabel } from '../../shared';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Image as ImageIcon, Settings } from 'lucide-react';
import { useSettingsState } from '../useSettingsState';
import { createBlockDefinition } from '../createBlockDefinition';
import { BlockShell } from '../shared/block-shell';
import { MediaUrlField } from '../shared/media-url-field';
import { usePostDocument } from '../../PageContext';

// ============================================================================
// TYPES
// ============================================================================

export type PostFeaturedImageContent = {
  url?: string;
  alt?: string;
  caption?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  aspectRatio?: string;
  className?: string;
};

const DEFAULT_CONTENT: PostFeaturedImageContent = {
  url: '',
  alt: 'Featured image',
  caption: '',
  objectFit: 'cover',
  aspectRatio: '16/9',
  className: '',
};

// ============================================================================
// URL INPUT ROW — reused in placeholder and hover overlay
// ============================================================================

/** Inline URL input + "Set" button used inside the renderer */
function UrlInputRow({
  value,
  onChange,
  onApply,
  placeholder,
  dark,
}: {
  value: string;
  onChange: (v: string) => void;
  onApply: () => void;
  placeholder: string;
  dark?: boolean;
}) {
  return (
    <div className="flex gap-1.5 px-4 w-full max-w-md">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onApply()}
        placeholder={placeholder}
        className={
          dark
            ? 'flex-1 px-2.5 py-1.5 text-sm bg-white/15 border border-white/30 text-white rounded-md outline-none placeholder:text-white/50'
            : 'flex-1 px-2.5 py-1.5 text-sm border border-npb-border-strong bg-npb-surface-base rounded-md outline-none placeholder:text-npb-text-muted'
        }
      />
      <button
        type="button"
        onClick={onApply}
        className="px-3 py-1.5 text-sm font-medium bg-npb-accent text-npb-text-inverse border-none rounded-md cursor-pointer">
        Set
      </button>
    </div>
  );
}

// ============================================================================
// RENDERER
// ============================================================================

interface RendererProps {
  content: PostFeaturedImageContent;
  styles?: React.CSSProperties;
  isEditor?: boolean;
  onChangeUrl?: (url: string) => void;
}

/**
 * Renders the featured image or a dashed placeholder when no URL is set.
 * In editor mode an overlay with URL input appears on hover (or inline for empty state).
 */
function PostFeaturedImageRenderer({
  content,
  styles,
  isEditor = false,
  onChangeUrl,
}: RendererProps) {
  const postDocument = usePostDocument();
  const [isHovered, setIsHovered] = useState(false);
  const [editUrl, setEditUrl] = useState('');

  const {
    url: contentUrl = '',
    alt = 'Featured image',
    caption = '',
    objectFit = 'cover',
    aspectRatio = '16/9',
    className = '',
  } = content ?? {};
  const url = contentUrl || postDocument?.featuredImage || '';

  const handleApply = () => {
    if (onChangeUrl && editUrl.trim()) {
      const nextUrl = editUrl.trim();
      onChangeUrl(nextUrl);
      postDocument?.updateDocument({ featuredImage: nextUrl });
      setEditUrl('');
    }
  };

  // Empty state — placeholder with dashed border
  if (!url) {
    return (
      <BlockShell as="figure" blockClass="wp-block-post-featured-image" className={className} style={styles}>
        <div
          className={
            `flex flex-col items-center justify-center gap-2 border-2 border-dashed border-npb-border-default rounded-lg bg-npb-surface-raised text-npb-text-muted ` +
            (isEditor ? 'cursor-pointer' : 'cursor-default')
          }
          style={{ aspectRatio, width: '100%' }}>
          <ImageIcon className="w-8 h-8 opacity-50" />
          <span className="text-sm font-medium">Set Featured Image</span>
          {isEditor && (
            <div className="mt-1">
              <UrlInputRow
                value={editUrl}
                onChange={setEditUrl}
                onApply={handleApply}
                placeholder="Paste image URL..."
              />
            </div>
          )}
        </div>
      </BlockShell>
    );
  }

  // Image present — render with optional editor hover overlay
  return (
    <BlockShell as="figure" blockClass="wp-block-post-featured-image" className={className} style={styles}>
      <div
        className="relative w-full"
        style={{ aspectRatio }}
        onMouseEnter={() => isEditor && setIsHovered(true)}
        onMouseLeave={() => isEditor && setIsHovered(false)}>
        <img
          src={url}
          alt={alt}
          className="w-full h-full block rounded"
          style={{ objectFit }}
        />

        {isEditor && isHovered && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 rounded">
            <span className="text-sm font-semibold text-white">Change Image</span>
            <UrlInputRow
              value={editUrl}
              onChange={setEditUrl}
              onApply={handleApply}
              placeholder="Paste new image URL..."
              dark
            />
          </div>
        )}
      </div>

      {caption && (
        <figcaption className="wp-element-caption text-center mt-2 text-npb-text-muted text-sm">
          {caption}
        </figcaption>
      )}
    </BlockShell>
  );
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

function PostFeaturedImageSettings({
  block,
  onUpdate,
}: {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}) {
  const { content, updateContent } = useSettingsState<PostFeaturedImageContent>({
    block,
    onUpdate,
    defaultContent: DEFAULT_CONTENT,
  });
  const postDocument = usePostDocument();
  const imageUrl = content?.url || postDocument?.featuredImage || '';

  const setUrl = (url: string) => {
    updateContent({ url });
    postDocument?.updateDocument({ featuredImage: url });
  };

  return (
    <div className="space-y-4">
      <CollapsibleCard title="Image" icon={ImageIcon} defaultOpen={true}>
        <div className="space-y-4">
          <MediaUrlField
            id="fi-url"
            label="Featured image"
            value={imageUrl}
            kind="image"
            placeholder="Paste an image URL or choose from the library"
            libraryButtonLabel="Choose from library"
            onChange={({ url }) => setUrl(url)}
            onLibrarySelect={({ item }) => setUrl(item.url)}
          />
          <div>
            <SettingsLabel htmlFor="fi-alt">Alt Text</SettingsLabel>
            <Input
              id="fi-alt"
              value={content?.alt || ''}
              onChange={(e) => updateContent({ alt: e.target.value })}
              placeholder="Describe the image"
              className="h-9"
            />
          </div>
          <div>
            <SettingsLabel htmlFor="fi-caption">Caption</SettingsLabel>
            <Input
              id="fi-caption"
              value={content?.caption || ''}
              onChange={(e) => updateContent({ caption: e.target.value })}
              placeholder="Optional caption"
              className="h-9"
            />
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Display" icon={Settings} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <SettingsLabel htmlFor="fi-object-fit">Object Fit</SettingsLabel>
            <Select
              value={content?.objectFit || 'cover'}
              onValueChange={(v) =>
                updateContent({
                  objectFit: v as PostFeaturedImageContent['objectFit'],
                })
              }>
              <SelectTrigger id="fi-object-fit" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Cover</SelectItem>
                <SelectItem value="contain">Contain</SelectItem>
                <SelectItem value="fill">Fill</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <SettingsLabel htmlFor="fi-aspect-ratio">Aspect Ratio</SettingsLabel>
            <Select
              value={content?.aspectRatio || '16/9'}
              onValueChange={(v) => updateContent({ aspectRatio: v })}>
              <SelectTrigger id="fi-aspect-ratio" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16/9">16 : 9</SelectItem>
                <SelectItem value="4/3">4 : 3</SelectItem>
                <SelectItem value="1/1">1 : 1</SelectItem>
                <SelectItem value="3/2">3 : 2</SelectItem>
                <SelectItem value="21/9">21 : 9</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleCard>
    </div>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const PostFeaturedImageBlock = createBlockDefinition<PostFeaturedImageContent>({
  id: 'post/featured-image',
  label: 'Featured Image',
  icon: ImageIcon,
  description: 'Display and set the post featured image',
  category: 'post',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: { width: '100%' },
  settings: PostFeaturedImageSettings,
  hasSettings: true,
  render: ({ content, styles, setContent, isPreview }) => (
    <PostFeaturedImageRenderer
      content={content}
      styles={styles}
      isEditor={!isPreview}
      onChangeUrl={(url) => setContent((prev) => ({ ...prev, url }))}
    />
  ),
});

export default PostFeaturedImageBlock;
