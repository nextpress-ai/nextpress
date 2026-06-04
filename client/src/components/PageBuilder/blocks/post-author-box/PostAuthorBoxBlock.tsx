import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import type { BlockDefinition, BlockComponentProps } from '../types.ts';
import type { BlockConfig } from '@shared/schema-types';
import { SettingsLabel } from '../../shared';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { UserCircle, Settings, Wrench } from 'lucide-react';
import { useSettingsState } from '../useSettingsState';
import { useBlockState } from '../useBlockState';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

export type PostAuthorBoxContent = {
  authorId?: string;
  postId?: string;
  showAvatar?: boolean;
  showBio?: boolean;
  showName?: boolean;
  layout?: 'horizontal' | 'vertical';
  avatarSize?: number;
  className?: string;
};

type AuthorData = { name?: string; avatar?: string; bio?: string };

const DEFAULT_CONTENT: PostAuthorBoxContent = {
  authorId: '',
  showAvatar: true,
  showBio: true,
  showName: true,
  layout: 'horizontal',
  avatarSize: 64,
  className: '',
};

const AVATAR_SIZE_MIN = 32;
const AVATAR_SIZE_MAX = 128;

const PLACEHOLDER_AUTHOR: AuthorData = {
  name: 'Author Name',
  avatar: '',
  bio: 'A short biography about the author. This text will be replaced with the actual author bio when the post is published.',
};

const LAYOUT_OPTIONS = [
  { value: 'horizontal' as const, label: 'Horizontal' },
  { value: 'vertical' as const, label: 'Vertical' },
] as const;

/** Build className string for the author box wrapper. */
function buildAuthorBoxClassName(
  content: PostAuthorBoxContent,
  layout: 'horizontal' | 'vertical',
): string {
  return [
    'wp-block-post-author-box',
    layout === 'vertical' ? 'author-box--vertical' : 'author-box--horizontal',
    content?.className || '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** Fetch author data from the API in preview mode. Returns null while loading or without authorId. */
function useAuthorData(
  authorId: string | undefined,
  isPreview: boolean,
): AuthorData | null {
  const { data } = useQuery({
    queryKey: ['author', authorId],
    queryFn: () =>
      fetch(`/api/users/${authorId}`)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch author');
          return res.json();
        }),
    enabled: !!isPreview && !!authorId,
    staleTime: 5 * 60 * 1000,
  });

  return data ?? null;
}

// ============================================================================
// RENDERER
// ============================================================================

interface PostAuthorBoxRendererProps {
  content: PostAuthorBoxContent;
  styles?: React.CSSProperties;
  isPreview?: boolean;
}

/**
 * Pure presentational renderer for the author box.
 * Preview: fetches real author data. Editor: shows placeholder layout.
 */
function PostAuthorBoxRenderer({
  content,
  styles,
  isPreview,
}: PostAuthorBoxRendererProps) {
  const layout = content?.layout ?? 'horizontal';
  const avatarSize = content?.avatarSize ?? 64;
  const showAvatar = content?.showAvatar ?? true;
  const showName = content?.showName ?? true;
  const showBio = content?.showBio ?? true;
  const className = buildAuthorBoxClassName(content, layout);

  const author = useAuthorData(content?.authorId, !!isPreview);
  const displayData: AuthorData =
    isPreview && author ? author : PLACEHOLDER_AUTHOR;

  const isVertical = layout === 'vertical';

  const avatarElement = showAvatar && (
    <div
      className="flex-shrink-0 rounded-full bg-npb-surface-inset overflow-hidden flex items-center justify-center"
      style={{ width: avatarSize, height: avatarSize }}>
      {displayData.avatar ? (
        <img
          src={displayData.avatar}
          alt={displayData.name || 'Author'}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <UserCircle
          className="text-npb-text-muted"
          style={{ width: avatarSize * 0.6, height: avatarSize * 0.6 }}
        />
      )}
    </div>
  );

  const textElement = (
    <div className={isVertical ? 'text-center' : ''}>
      {showName && (
        <p className="font-semibold text-base leading-tight">
          {displayData.name || 'Author Name'}
        </p>
      )}
      {showBio && (
        <p className="text-sm text-npb-text-secondary mt-1 leading-relaxed">
          {displayData.bio || 'No bio available.'}
        </p>
      )}
    </div>
  );

  return (
    <div className={className} style={styles}>
      <div
        className={
          isVertical
            ? 'flex flex-col items-center gap-3'
            : 'flex items-start gap-4'
        }>
        {avatarElement}
        {textElement}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PostAuthorBoxComponent({
  value,
  onChange,
  isPreview,
}: BlockComponentProps) {
  const { content, styles } = useBlockState<PostAuthorBoxContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
  });

  return (
    <PostAuthorBoxRenderer
      content={content}
      styles={styles}
      isPreview={isPreview}
    />
  );
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface PostAuthorBoxSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

/** Sidebar settings for the author box block. */
function PostAuthorBoxSettings({
  block,
  onUpdate,
}: PostAuthorBoxSettingsProps) {
  const { content, updateContent } = useSettingsState<PostAuthorBoxContent>({
    block,
    onUpdate,
    defaultContent: DEFAULT_CONTENT,
  });

  const currentLayout = content?.layout ?? 'horizontal';
  const currentAvatarSize = content?.avatarSize ?? 64;
  const currentShowAvatar = content?.showAvatar ?? true;
  const currentShowName = content?.showName ?? true;
  const currentShowBio = content?.showBio ?? true;

  return (
    <div className="space-y-4">
      {/* Author Box Settings */}
      <CollapsibleCard title="Author Box Settings" icon={Settings} defaultOpen>
        <div className="space-y-4">
          {/* Author ID */}
          <div>
            <SettingsLabel htmlFor="author-id">Author ID</SettingsLabel>
            <Input
              id="author-id"
              value={content?.authorId || ''}
              onChange={(e) => updateContent({ authorId: e.target.value })}
              placeholder="Enter author ID"
              className="mt-1 h-9 text-sm"
            />
          </div>

          {/* Layout Select */}
          <div>
            <SettingsLabel>Layout</SettingsLabel>
            <Select
              value={currentLayout}
              onValueChange={(val) =>
                updateContent({ layout: val as 'horizontal' | 'vertical' })
              }>
              <SelectTrigger className="mt-1 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LAYOUT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Avatar Size */}
          <div>
            <SettingsLabel htmlFor="avatar-size">Avatar Size (px)</SettingsLabel>
            <Input
              id="avatar-size"
              type="number"
              min={AVATAR_SIZE_MIN}
              max={AVATAR_SIZE_MAX}
              value={currentAvatarSize}
              onChange={(e) => {
                const parsed = parseInt(e.target.value, 10);
                if (!isNaN(parsed)) {
                  const clamped = Math.max(
                    AVATAR_SIZE_MIN,
                    Math.min(AVATAR_SIZE_MAX, parsed),
                  );
                  updateContent({ avatarSize: clamped });
                }
              }}
              className="mt-1 h-9 text-sm"
            />
          </div>

          {/* Visibility Toggles */}
          {[
            {
              id: 'show-avatar',
              label: 'Show Avatar',
              key: 'showAvatar' as const,
              value: currentShowAvatar,
            },
            {
              id: 'show-name',
              label: 'Show Name',
              key: 'showName' as const,
              value: currentShowName,
            },
            {
              id: 'show-bio',
              label: 'Show Bio',
              key: 'showBio' as const,
              value: currentShowBio,
            },
          ].map((toggle) => (
            <div key={toggle.id} className="flex items-center justify-between">
              <SettingsLabel htmlFor={toggle.id}>
                {toggle.label}
              </SettingsLabel>
              <Switch
                id={toggle.id}
                checked={toggle.value}
                onCheckedChange={(checked) =>
                  updateContent({ [toggle.key]: checked })
                }
              />
            </div>
          ))}
        </div>
      </CollapsibleCard>

      {/* Post */}
      <CollapsibleCard title="Post" icon={Wrench} defaultOpen={false}>
        <div className="space-y-2">
          <SettingsLabel>Post ID</SettingsLabel>
          {content?.postId ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs truncate">
                {content.postId}
              </Badge>
              <button
                onClick={() => updateContent({ postId: '' })}
                className="text-xs text-npb-text-muted hover:text-npb-status-error">
                clear
              </button>
            </div>
          ) : (
            <Input
              value={content?.postId || ''}
              onChange={(e) => updateContent({ postId: e.target.value })}
              placeholder="Auto-set when added to a post"
              className="h-9 text-sm"
            />
          )}
        </div>
      </CollapsibleCard>
    </div>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

/**
 * Post Author Box block definition for the PageBuilder.
 * Displays the post author's avatar, name, and bio in a configurable layout.
 */
const PostAuthorBoxBlock: BlockDefinition = {
  id: 'post/author-box',
  label: 'Post Author Box',
  icon: UserCircle,
  description: "Display the post author's avatar, name, and bio",
  category: 'post',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: { margin: '0 0 1em 0' },
  component: PostAuthorBoxComponent,
  settings: PostAuthorBoxSettings,
  hasSettings: true,
};

export default PostAuthorBoxBlock;
