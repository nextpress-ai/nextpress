import type { BlockConfig } from '@shared/schema-types';
import { SettingsLabel } from '../../shared';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Settings } from 'lucide-react';
import { useSettingsState } from '../useSettingsState';
import { MediaUrlField } from '../shared/media-url-field';
import { usePostDocument } from '../../PageContext';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import { userOtherWithBio } from '@shared/author-display';
import { Button } from '@/components/ui/button';
import {
  type PostAuthorBoxContent,
  DEFAULT_CONTENT,
  LAYOUT_OPTIONS,
  AVATAR_SIZE_MIN,
  AVATAR_SIZE_MAX,
  hasAuthorOverride,
  useAuthorData,
} from './post-author-box-model';

/** Sidebar settings for the author box block. */
export function PostAuthorBoxSettings({
  block,
  onUpdate,
}: {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}) {
  const { content, updateContent } = useSettingsState<PostAuthorBoxContent>({
    block,
    onUpdate,
    defaultContent: DEFAULT_CONTENT,
  });
  const postDocument = usePostDocument();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const resolvedAuthorId = content?.authorId || postDocument?.authorId;
  const author = useAuthorData(resolvedAuthorId);
  const currentUserId =
    user && typeof user === 'object' && 'id' in user
      ? String((user as { id?: string }).id ?? '')
      : '';
  const canEditProfile = Boolean(
    resolvedAuthorId && currentUserId && resolvedAuthorId === currentUserId,
  );

  const currentLayout = content?.layout ?? 'horizontal';
  const currentAvatarSize = content?.avatarSize ?? 64;
  const currentShowAvatar = content?.showAvatar ?? true;
  const currentShowName = content?.showName ?? true;
  const currentShowBio = content?.showBio ?? true;

  const saveProfile = async (patch: {
    name?: string;
    bio?: string;
    avatar?: string;
  }) => {
    if (!resolvedAuthorId || !canEditProfile) return;
    const other = userOtherWithBio({
      other: (user as { other?: unknown }).other,
      bio: patch.bio ?? author?.bio ?? '',
    });
    await apiRequest('PUT', `/api/users/${resolvedAuthorId}`, {
      name: patch.name ?? author?.name,
      profileImageUrl: patch.avatar ?? author?.avatar,
      other,
    });
    await queryClient.invalidateQueries({ queryKey: ['author', resolvedAuthorId] });
    await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
  };

  return (
    <div className="space-y-4">
      <CollapsibleCard title="Author Box Settings" icon={Settings} defaultOpen>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-npb-text-secondary">
              {author
                ? `Showing ${author.name}.`
                : 'No author is linked yet. Use your profile to fill name, photo, and bio.'}
            </p>
            {currentUserId ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => updateContent({ authorId: currentUserId })}>
                Use my profile
              </Button>
            ) : null}
          </div>
          {canEditProfile ? (
            <div className="space-y-3">
              <div>
                <SettingsLabel htmlFor="author-name">Name</SettingsLabel>
                <Input
                  id="author-name"
                  key={`author-name-${resolvedAuthorId}-${author?.name ?? ''}`}
                  defaultValue={author?.name || ''}
                  onBlur={(e) => {
                    void saveProfile({ name: e.target.value });
                  }}
                  placeholder="Author name"
                  className="mt-1 h-9 text-sm"
                />
              </div>
              <div>
                <SettingsLabel htmlFor="author-bio">Bio</SettingsLabel>
                <Textarea
                  id="author-bio"
                  key={`author-bio-${resolvedAuthorId}-${author?.bio ?? ''}`}
                  defaultValue={author?.bio || ''}
                  onBlur={(e) => {
                    void saveProfile({ bio: e.target.value });
                  }}
                  placeholder="A short bio"
                  rows={3}
                  className="mt-1 text-sm resize-y"
                />
              </div>
              <MediaUrlField
                id="author-photo"
                label="Photo"
                value={author?.avatar || ''}
                kind="image"
                placeholder="Profile photo URL"
                libraryButtonLabel="Choose from library"
                onChange={({ url }) => {
                  void saveProfile({ avatar: url });
                }}
                onLibrarySelect={({ item }) => {
                  void saveProfile({ avatar: item.url });
                }}
              />
            </div>
          ) : null}

          <div className="pt-1 border-t border-npb-border-default space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <SettingsLabel>Custom content</SettingsLabel>
                <p className="text-xs text-npb-text-muted mt-0.5">
                  Set your own text and photo here.
                </p>
              </div>
              {hasAuthorOverride(content) ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600 h-7 text-xs"
                  onClick={() =>
                    updateContent({ name: '', avatar: '', bio: '' })
                  }>
                  Clear custom content
                </Button>
              ) : null}
            </div>
            {hasAuthorOverride(content) ? (
              <p className="text-xs text-npb-text-secondary">
                Custom fields replace matching profile details.
              </p>
            ) : null}
            <div>
              <SettingsLabel htmlFor="author-custom-name">Name</SettingsLabel>
              <Input
                id="author-custom-name"
                key={`author-custom-name-${content?.name ?? ''}`}
                defaultValue={content?.name || ''}
                onBlur={(e) => {
                  updateContent({ name: e.target.value });
                }}
                placeholder="Author name"
                className="mt-1 h-9 text-sm"
              />
            </div>
            <div>
              <SettingsLabel htmlFor="author-custom-bio">Bio</SettingsLabel>
              <Textarea
                id="author-custom-bio"
                key={`author-custom-bio-${content?.bio ?? ''}`}
                defaultValue={content?.bio || ''}
                onBlur={(e) => {
                  updateContent({ bio: e.target.value });
                }}
                placeholder="A short bio"
                rows={3}
                className="mt-1 text-sm resize-y"
              />
            </div>
            <MediaUrlField
              id="author-custom-photo"
              label="Photo"
              value={content?.avatar || ''}
              kind="image"
              placeholder="Profile photo URL"
              libraryButtonLabel="Choose from library"
              onChange={({ url }) => {
                updateContent({ avatar: url });
              }}
              onLibrarySelect={({ item }) => {
                updateContent({ avatar: item.url });
              }}
            />
          </div>

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
                {LAYOUT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                if (!Number.isNaN(parsed)) {
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
    </div>
  );
}
