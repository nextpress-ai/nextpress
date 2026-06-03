/**
 * Post Comments block data model: content shape, comment item type, defaults,
 * and pure preview/date helpers. No React here — see `post-comments-settings.tsx`
 * for the UI and `PostCommentsBlock.tsx` for the renderer.
 */

export type PostCommentsContent = {
  postId?: string;
  showForm?: boolean;
  showCount?: boolean;
  commentsPerPage?: number;
  allowReplies?: boolean;
  className?: string;
};

export type CommentItem = {
  id: number;
  author: string;
  email?: string;
  date: string;
  content: string;
  replies?: CommentItem[];
};

export const DEFAULT_CONTENT: PostCommentsContent = {
  postId: '',
  showForm: true,
  showCount: true,
  commentsPerPage: 10,
  allowReplies: true,
  className: '',
};

// --- Helpers ---

/** Generates placeholder comments for the editor preview. */
export function buildPlaceholderComments(): CommentItem[] {
  return [
    {
      id: 1,
      author: 'Jane Doe',
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      content:
        'Great article! I really enjoyed reading this. The points you made about architecture were spot on.',
      replies: [
        {
          id: 4,
          author: 'Author',
          date: new Date(Date.now() - 86400000).toISOString(),
          content: 'Thank you, Jane! Glad you found it useful.',
        },
      ],
    },
    {
      id: 2,
      author: 'John Smith',
      date: new Date(Date.now() - 86400000 * 5).toISOString(),
      content:
        'Very insightful. Would love to see a follow-up post diving deeper into the topic.',
    },
    {
      id: 3,
      author: 'Alice Lee',
      date: new Date(Date.now() - 86400000 * 7).toISOString(),
      content: 'Thanks for sharing this. Bookmarked for future reference!',
    },
  ];
}

/** Formats an ISO date string to a human-readable locale date. */
export function formatDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Generates initials from an author name for the avatar circle. */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
