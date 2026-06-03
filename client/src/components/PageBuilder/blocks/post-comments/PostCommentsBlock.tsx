import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import { useBlockState } from '../useBlockState';
import type { BlockDefinition, BlockComponentProps } from '../types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare } from 'lucide-react';
import {
  type PostCommentsContent,
  type CommentItem,
  DEFAULT_CONTENT,
  buildPlaceholderComments,
  formatDate,
  getInitials,
} from './post-comments-model';
import { PostCommentsSettings } from './post-comments-settings';

// --- Comment Entry ---

/** Renders a single comment with avatar, metadata, content, and optional nested replies. */
function CommentEntry({
  comment,
  allowReplies,
  depth = 0,
}: {
  comment: CommentItem;
  allowReplies: boolean;
  depth?: number;
}) {
  const hasReplies =
    allowReplies && comment.replies && comment.replies.length > 0;

  return (
    <div className={depth > 0 ? 'ml-8 pl-4 border-l-2 border-npb-border-default' : ''}>
      <div className="flex items-start gap-3 py-3">
        <div className="w-9 h-9 rounded-full bg-npb-surface-inset flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-semibold text-npb-text-secondary">
            {getInitials(comment.author)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-npb-text-primary">
              {comment.author}
            </span>
            <span className="text-xs text-npb-text-muted">
              {formatDate(comment.date)}
            </span>
          </div>
          <p className="text-sm text-npb-text-secondary leading-relaxed">
            {comment.content}
          </p>
        </div>
      </div>
      {hasReplies &&
        comment.replies!.map((reply) => (
          <CommentEntry
            key={reply.id}
            comment={reply}
            allowReplies={allowReplies}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}

// --- Comment Form ---

/** Renders the "Leave a Comment" form with name, email, and comment fields. */
function CommentForm({ isPreview }: { isPreview?: boolean }) {
  return (
    <div className="mt-6 pt-6 border-t border-npb-divider">
      <h3 className="text-base font-semibold text-npb-text-primary mb-4">
        Leave a Comment
      </h3>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Name *"
            className="h-9 text-sm"
            disabled={!isPreview}
          />
          <Input
            placeholder="Email *"
            type="email"
            className="h-9 text-sm"
            disabled={!isPreview}
          />
        </div>
        <Textarea
          placeholder="Write your comment..."
          rows={4}
          className="text-sm resize-y"
          disabled={!isPreview}
        />
        <Button size="sm" disabled={!isPreview}>
          Post Comment
        </Button>
      </div>
    </div>
  );
}

// --- Renderer ---

/**
 * Renders the comments section.
 * Preview mode fetches real comments from the API; editor mode shows placeholders.
 */
function PostCommentsRenderer({
  content,
  styles,
  isPreview,
}: {
  content: PostCommentsContent;
  styles?: React.CSSProperties;
  isPreview?: boolean;
}) {
  const cfg = {
    ...DEFAULT_CONTENT,
    ...content,
  } as Required<PostCommentsContent>;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['comments', cfg.postId, cfg.commentsPerPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        postId: cfg.postId,
        per_page: String(cfg.commentsPerPage),
      });
      const res = await fetch(`/api/comments?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to fetch comments (${res.status})`);
      const json = await res.json();
      const items: CommentItem[] = (
        Array.isArray(json) ? json : (json.comments ?? [])
      ).map((c: any) => ({
        id: c.id,
        author: c.author ?? c.authorName ?? 'Anonymous',
        date: c.date ?? c.createdAt ?? c.created_at ?? '',
        content: c.content ?? c.body ?? '',
        replies: Array.isArray(c.replies)
          ? c.replies.map((r: any) => ({
              id: r.id,
              author: r.author ?? r.authorName ?? 'Anonymous',
              date: r.date ?? r.createdAt ?? r.created_at ?? '',
              content: r.content ?? r.body ?? '',
            }))
          : [],
      }));
      return items;
    },
    enabled: !!isPreview && !!cfg.postId,
    staleTime: 5 * 60 * 1000,
  });

  const comments: CommentItem[] = data ?? (isPreview ? [] : buildPlaceholderComments());

  const wrapperClass = ['np-post-comments', cfg.className]
    .filter(Boolean)
    .join(' ');

  if (isLoading)
    return (
      <div className={wrapperClass} style={styles}>
        <p className="text-sm text-npb-text-muted py-8 text-center">
          Loading comments…
        </p>
      </div>
    );
  if (isError)
    return (
      <div className={wrapperClass} style={styles}>
        <p className="text-sm text-npb-status-error py-8 text-center">
          {error instanceof Error ? error.message : 'Failed to load comments'}
        </p>
      </div>
    );

  return (
    <div className={wrapperClass} style={styles}>
      {cfg.showCount && (
        <h2 className="text-lg font-semibold text-npb-text-primary mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
        </h2>
      )}
      {comments.length === 0 && !cfg.showForm && (
        <div className="text-center text-npb-text-muted py-8 border-2 border-dashed border-npb-border-strong rounded">
          <MessageSquare className="w-10 h-10 mx-auto mb-2" />
          <p>No comments yet</p>
        </div>
      )}
      {comments.length > 0 && (
        <div className="divide-y divide-npb-surface-inset">
          {comments.map((comment) => (
            <CommentEntry
              key={comment.id}
              comment={comment}
              allowReplies={cfg.allowReplies}
            />
          ))}
        </div>
      )}
      {cfg.showForm && <CommentForm isPreview={isPreview} />}
    </div>
  );
}

// --- Main Component ---

export function PostCommentsBlockComponent({
  value,
  onChange,
  isPreview,
}: BlockComponentProps) {
  const { content, styles } = useBlockState<PostCommentsContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
  });
  return (
    <PostCommentsRenderer
      content={content}
      styles={styles}
      isPreview={isPreview}
    />
  );
}

// --- Block Definition ---

/**
 * Post Comments block for the PageBuilder.
 * Displays a comment list and submission form. Editor mode shows placeholders;
 * preview mode fetches real comments from the API.
 */
const PostCommentsBlock: BlockDefinition = {
  id: 'post/comments',
  label: 'Post Comments',
  icon: MessageSquare,
  description: 'Display post comments and a comment submission form',
  category: 'post',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: { margin: '1em 0' },
  component: PostCommentsBlockComponent,
  settings: PostCommentsSettings,
  hasSettings: true,
};

export default PostCommentsBlock;
