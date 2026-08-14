import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { createBlockDefinition } from '../createBlockDefinition';
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
import { usePostDocument } from '../../PageContext';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';

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

function mapCommentItem(c: {
  id?: string | number;
  author?: string;
  authorName?: string;
  date?: string;
  createdAt?: string;
  content?: string;
  body?: string;
  replies?: unknown[];
}): CommentItem {
  return {
    id: Number(c.id) || 0,
    author: c.author ?? c.authorName ?? 'Anonymous',
    date: c.date ?? c.createdAt ?? '',
    content: c.content ?? c.body ?? '',
    replies: Array.isArray(c.replies)
      ? c.replies.map((reply) =>
          mapCommentItem(
            reply && typeof reply === 'object'
              ? (reply as Parameters<typeof mapCommentItem>[0])
              : {},
          ),
        )
      : [],
  };
}

/** Renders the comment form and posts to the comments API. */
function CommentForm({
  postId,
  publishNow,
}: {
  postId: string;
  publishNow?: boolean;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userName =
    user && typeof user === 'object' && 'name' in user
      ? String((user as { name?: string }).name ?? '')
      : '';
  const userEmail =
    user && typeof user === 'object' && 'email' in user
      ? String((user as { email?: string }).email ?? '')
      : '';
  const [name, setName] = React.useState(userName);
  const [email, setEmail] = React.useState(userEmail);
  const [body, setBody] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const [error, setError] = React.useState('');

  const canSend = Boolean(postId && name.trim() && body.trim());

  const submit = async () => {
    if (!canSend || isSending) return;
    setIsSending(true);
    setError('');
    try {
      await apiRequest('POST', '/api/comments', {
        postId,
        content: body.trim(),
        authorName: name.trim(),
        authorEmail: email.trim() || undefined,
        authorId: user && typeof user === 'object' && 'id' in user
          ? String((user as { id?: string }).id ?? '') || undefined
          : undefined,
        ...(publishNow ? { status: 'approved' } : {}),
      });
      setBody('');
      await queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    } catch {
      setError('Could not post the comment. Try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-npb-divider">
      <h3 className="text-base font-semibold text-npb-text-primary mb-4">
        Leave a Comment
      </h3>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Name"
            className="h-9 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Email"
            type="email"
            className="h-9 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Textarea
          placeholder="Write your comment..."
          rows={4}
          className="text-sm resize-y"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        {error ? (
          <p className="text-sm text-npb-status-error">{error}</p>
        ) : null}
        <Button
          size="sm"
          disabled={!canSend || isSending}
          onClick={() => {
            void submit();
          }}>
          Post Comment
        </Button>
      </div>
    </div>
  );
}

// --- Renderer ---

/**
 * Renders the comments section.
 * Fetches real comments when a post id is known; otherwise shows placeholders.
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
  const postDocument = usePostDocument();
  const cfg = {
    ...DEFAULT_CONTENT,
    ...content,
  } as Required<PostCommentsContent>;
  const postId = cfg.postId || postDocument?.postId || '';
  const listStatus = isPreview ? 'approved' : 'all';

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['comments', postId, cfg.commentsPerPage, listStatus],
    queryFn: async () => {
      const params = new URLSearchParams({
        postId,
        per_page: String(cfg.commentsPerPage),
        status: listStatus,
      });
      const res = await fetch(`/api/comments?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Failed to fetch comments (${res.status})`);
      const json = await res.json();
      const raw = Array.isArray(json) ? json : (json.comments ?? []);
      return (Array.isArray(raw) ? raw : []).map((item: Parameters<typeof mapCommentItem>[0]) =>
        mapCommentItem(item),
      );
    },
    enabled: !!postId,
    staleTime: 5 * 60 * 1000,
  });

  const comments: CommentItem[] = data ?? (postId ? [] : buildPlaceholderComments());

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
      {cfg.showForm && postId ? (
        <CommentForm postId={postId} publishNow={!isPreview} />
      ) : null}
    </div>
  );
}

// --- Block Definition ---

/**
 * Post Comments block for the PageBuilder.
 * Displays a comment list and submission form. Editor mode shows placeholders;
 * preview mode fetches real comments from the API.
 */
const PostCommentsBlock = createBlockDefinition<PostCommentsContent>({
  id: 'post/comments',
  label: 'Post Comments',
  icon: MessageSquare,
  description: 'Display post comments and a comment submission form',
  category: 'post',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: { margin: '1em 0' },
  settings: PostCommentsSettings,
  hasSettings: true,
  render: ({ content, styles, isPreview }) => (
    <PostCommentsRenderer content={content} styles={styles} isPreview={isPreview} />
  ),
});

export default PostCommentsBlock;
