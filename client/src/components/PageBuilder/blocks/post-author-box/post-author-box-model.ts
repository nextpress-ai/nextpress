import { useQuery } from '@tanstack/react-query';
import {
  authorDisplayFromUser,
  mergeAuthorDisplay,
  type AuthorFields,
} from '@shared/author-display';

export { mergeAuthorDisplay } from '@shared/author-display';
export type { AuthorFields } from '@shared/author-display';

export type PostAuthorBoxContent = {
  authorId?: string;
  postId?: string;
  showAvatar?: boolean;
  showBio?: boolean;
  showName?: boolean;
  layout?: 'horizontal' | 'vertical';
  avatarSize?: number;
  className?: string;
  name?: string;
  avatar?: string;
  bio?: string;
};

export type AuthorData = { name?: string; avatar?: string; bio?: string };

export const DEFAULT_CONTENT: PostAuthorBoxContent = {
  authorId: '',
  postId: '',
  showAvatar: true,
  showBio: true,
  showName: true,
  layout: 'horizontal',
  avatarSize: 64,
  className: '',
};

export const AVATAR_SIZE_MIN = 32;
export const AVATAR_SIZE_MAX = 128;

export const PLACEHOLDER_AUTHOR: AuthorData = {
  name: 'Author Name',
  avatar: '',
  bio: 'A short biography about the author. This text will be replaced with the actual author bio when the post is published.',
};

export const LAYOUT_OPTIONS = [
  { value: 'horizontal' as const, label: 'Horizontal' },
  { value: 'vertical' as const, label: 'Vertical' },
] as const;

/** True when the block carries explicit custom author fields that override the profile. */
export function hasAuthorOverride(content: PostAuthorBoxContent): boolean {
  return Boolean(
    (content?.name && content.name.trim()) ||
      (content?.avatar && content.avatar.trim()) ||
      (content?.bio && content.bio.trim()),
  );
}

/** Build extra className modifiers for the author box wrapper. */
export function buildAuthorBoxClassName(
  content: PostAuthorBoxContent,
  layout: 'horizontal' | 'vertical',
): string | undefined {
  return (
    [
      layout === 'vertical' ? 'author-box--vertical' : 'author-box--horizontal',
      content?.className || '',
    ]
      .filter(Boolean)
      .join(' ') || undefined
  );
}

/** Fetch author data from the API. Returns null while loading or without authorId. */
export function useAuthorData(authorId: string | undefined): AuthorData | null {
  const { data } = useQuery({
    queryKey: ['author', authorId],
    queryFn: () =>
      fetch(`/api/users/${authorId}`, { credentials: 'include' })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch author');
          return res.json();
        }),
    enabled: !!authorId,
    staleTime: 5 * 60 * 1000,
  });

  if (!data) return null;
  const mapped = authorDisplayFromUser(data);
  return mapped
    ? { name: mapped.name, avatar: mapped.avatar, bio: mapped.bio }
    : null;
}
