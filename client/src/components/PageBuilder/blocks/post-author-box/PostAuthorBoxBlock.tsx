import * as React from 'react';
import { UserCircle } from 'lucide-react';
import { createBlockDefinition } from '../createBlockDefinition';
import { BlockShell } from '../shared/block-shell';
import { usePostDocument } from '../../PageContext';
import { PostAuthorBoxSettings } from './post-author-box-settings';
import {
  type PostAuthorBoxContent,
  type AuthorData,
  DEFAULT_CONTENT,
  PLACEHOLDER_AUTHOR,
  buildAuthorBoxClassName,
  useAuthorData,
} from './post-author-box-model';

function boundAuthorFromContent(content: PostAuthorBoxContent): AuthorData | null {
  if (!content?.name && !content?.avatar && !content?.bio) return null;
  return {
    name: content.name,
    avatar: content.avatar,
    bio: content.bio,
  };
}

/**
 * Pure presentational renderer for the author box.
 * Prefers a live profile fetch, then bound post author fields, then a placeholder.
 */
function PostAuthorBoxRenderer({
  content,
  styles,
}: {
  content: PostAuthorBoxContent;
  styles?: React.CSSProperties;
}) {
  const postDocument = usePostDocument();
  const layout = content?.layout ?? 'horizontal';
  const avatarSize = content?.avatarSize ?? 64;
  const showAvatar = content?.showAvatar ?? true;
  const showName = content?.showName ?? true;
  const showBio = content?.showBio ?? true;
  const className = buildAuthorBoxClassName(content, layout);
  const authorId = content?.authorId || postDocument?.authorId;
  const author = useAuthorData(authorId);
  const displayData: AuthorData =
    author ??
    boundAuthorFromContent(content) ??
    postDocument?.author ??
    PLACEHOLDER_AUTHOR;

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
    <BlockShell blockClass="wp-block-post-author-box" className={className} style={styles}>
      <div
        className={
          isVertical
            ? 'flex flex-col items-center gap-3'
            : 'flex items-start gap-4'
        }>
        {avatarElement}
        {textElement}
      </div>
    </BlockShell>
  );
}

/**
 * Post Author Box block definition for the PageBuilder.
 * Displays the post author's avatar, name, and bio in a configurable layout.
 */
const PostAuthorBoxBlock = createBlockDefinition<PostAuthorBoxContent>({
  id: 'post/author-box',
  label: 'Author Box',
  icon: UserCircle,
  description: "Display the post author's avatar, name, and bio",
  category: 'post',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: { margin: '0 0 1em 0' },
  settings: PostAuthorBoxSettings,
  hasSettings: true,
  render: ({ content, styles }) => (
    <PostAuthorBoxRenderer content={content} styles={styles} />
  ),
});

export default PostAuthorBoxBlock;
