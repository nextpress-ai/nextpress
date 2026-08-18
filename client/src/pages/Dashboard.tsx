import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  File,
  MessageCircle,
  Users,
  Plus,
  ExternalLink,
  Pencil,
  Image,
  Command,
  Palette,
  ArrowRight,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { useActiveSite } from '@/hooks/useActiveSite';
import { useAuth } from '@/hooks/useAuth';
import { ThemeColorPreview } from '@/components/themes/theme-color-preview';
import { Link } from 'wouter';
import { pageEditorPath, postEditorPath } from '@/lib/admin-content-routes';
import { formatContentStatus } from '@/lib/format-content-status';
import {
  MotionPressable,
  MotionStagger,
  MotionStaggerItem,
} from '@/components/motion/motion-primitives';
import type { Theme } from '@shared/schema-types';
import { resolveThemeDisplayCopy } from '@shared/theme-display';

type ContentRow = {
  id: string;
  title: string;
  createdAt: string;
  status: string;
};

type RecentContentItem = {
  id: string;
  title: string;
  createdAt: string;
  status: string;
  kind: 'post' | 'page';
  editHref: string;
};

const SHORTCUTS = [
  { label: 'New post', href: '/admin/posts?create=true', icon: FileText },
  { label: 'New page', href: '/admin/pages?create=true', icon: File },
  { label: 'Media library', href: '/admin/media', icon: Image },
  { label: 'Themes', href: '/admin/themes', icon: Palette },
] as const;

/** Merges recent posts and pages into one timeline for the dashboard. */
function buildRecentContentItems({
  posts,
  pages,
  limit = 6,
}: {
  posts: ContentRow[] | undefined;
  pages: ContentRow[] | undefined;
  limit?: number;
}): RecentContentItem[] {
  const postItems: RecentContentItem[] = (posts ?? []).map((post) => ({
    ...post,
    kind: 'post',
    editHref: postEditorPath(post.id),
  }));
  const pageItems: RecentContentItem[] = (pages ?? []).map((page) => ({
    ...page,
    kind: 'page',
    editHref: pageEditorPath(page.id),
  }));

  return [...postItems, ...pageItems]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
    .slice(0, limit);
}

function welcomeName(user: { firstName?: string | null; username?: string | null } | null | undefined): string | null {
  const name = user?.firstName?.trim() || user?.username?.trim();
  return name || null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { activeSiteId } = useActiveSite();
  const displayName = welcomeName(user);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats', { siteId: activeSiteId }],
    enabled: !!activeSiteId,
  });

  const { data: recentPosts, isLoading: postsLoading } = useQuery({
    queryKey: [
      '/api/posts',
      {
        status: 'any',
        per_page: 5,
        siteId: activeSiteId,
        sort: 'createdAt',
        order: 'desc',
      },
    ],
    enabled: !!activeSiteId,
  });

  const { data: recentPages, isLoading: pagesLoading } = useQuery({
    queryKey: [
      '/api/pages',
      {
        status: 'any',
        per_page: 5,
        siteId: activeSiteId,
        sort: 'createdAt',
        order: 'desc',
      },
    ],
    enabled: !!activeSiteId,
  });

  const { data: siteInfo } = useQuery<{ status: boolean; data: { activeThemeId: string | null } }>({
    queryKey: ['/api/site', { siteId: activeSiteId }],
    enabled: !!activeSiteId,
  });

  const { data: themes } = useQuery<Theme[]>({
    queryKey: ['/api/themes'],
  });

  const activeTheme = themes?.find((theme) => theme.id === siteInfo?.data?.activeThemeId);
  const activeThemeCopy = activeTheme ? resolveThemeDisplayCopy(activeTheme) : null;

  const recentContent = useMemo(
    () =>
      buildRecentContentItems({
        posts: (recentPosts as { posts?: ContentRow[] } | undefined)?.posts,
        pages: (recentPages as { pages?: ContentRow[] } | undefined)?.pages,
      }),
    [recentPosts, recentPages],
  );

  const recentLoading = postsLoading || pagesLoading;

  const statsItems = [
    { label: 'Posts', value: (stats as { posts?: number })?.posts ?? 0, icon: FileText, href: '/admin/posts' },
    { label: 'Pages', value: (stats as { pages?: number })?.pages ?? 0, icon: File, href: '/admin/pages' },
    { label: 'Comments', value: (stats as { comments?: number })?.comments ?? 0, icon: MessageCircle, href: '/admin/comments' },
    { label: 'Users', value: (stats as { users?: number })?.users ?? 0, icon: Users, href: '/admin/users' },
  ];

  const headerActions = (
    <>
      <div className="hidden items-center gap-1.5 rounded-[var(--npb-radius-input)] border border-dashed border-npb-border-strong px-3 py-1.5 text-xs font-medium text-npb-text-secondary md:inline-flex">
        <Command className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          Press <kbd className="rounded border border-npb-border-default px-1 font-mono text-[10px]">⌘K</kbd> to jump anywhere
        </span>
      </div>
      <Button size="sm" asChild className="npb-btn-accent">
        <Link href="/admin/posts?create=true">
          <Plus className="mr-2 h-4 w-4" />
          New Post
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <a href="/" target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-2 h-4 w-4" />
          View Site
        </a>
      </Button>
    </>
  );

  return (
    <AdminLayout title="Dashboard" actions={headerActions}>
      <div className="mb-6">
        <p className="text-lg font-medium text-npb-text-primary">
          {displayName ? `Welcome back, ${displayName}` : 'Welcome back'}
        </p>
        <p className="mt-1 text-sm text-npb-text-secondary">
          Here is a quick look at your site.
        </p>
      </div>

      <MotionStagger className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {statsItems.map((item) => {
          const Icon = item.icon;
          return (
            <MotionStaggerItem key={item.label}>
              <Link href={item.href}>
                <MotionPressable className="group rounded-[var(--npb-radius-surface)] border border-npb-border-strong bg-npb-surface-base p-4 shadow-[var(--npb-shadow-surface)] transition-colors hover:border-npb-accent/40 hover:bg-npb-surface-raised">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-3xl font-bold tabular-nums tracking-tight text-npb-text-primary">
                        {statsLoading ? '…' : item.value}
                      </p>
                      <p className="mt-1 text-sm font-medium text-npb-text-secondary">{item.label}</p>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--npb-radius-input)] bg-npb-accent/12 text-npb-accent transition-colors group-hover:bg-npb-accent/18">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                  </div>
                </MotionPressable>
              </Link>
            </MotionStaggerItem>
          );
        })}
      </MotionStagger>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="admin-surface lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold text-npb-text-primary">Recent content</CardTitle>
            <div className="flex items-center gap-3 text-sm">
              <Link href="/admin/posts" className="font-medium text-npb-accent hover:underline">
                Posts
              </Link>
              <Link href="/admin/pages" className="font-medium text-npb-accent hover:underline">
                Pages
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {recentLoading ? (
              <div className="py-8 text-center text-npb-text-muted">Loading…</div>
            ) : recentContent.length ? (
              <div className="divide-y divide-npb-divider">
                {recentContent.map((item) => {
                  const KindIcon = item.kind === 'post' ? FileText : File;
                  return (
                    <div
                      key={`${item.kind}-${item.id}`}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--npb-radius-input)] bg-npb-surface-inset text-npb-accent">
                          <KindIcon className="h-4 w-4" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <Link href={item.editHref}>
                            <h4 className="truncate font-medium text-npb-text-primary hover:text-npb-accent">
                              {item.title}
                            </h4>
                          </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-npb-text-muted">
                            <span className="font-medium text-npb-text-secondary">
                              {item.kind === 'post' ? 'Post' : 'Page'}
                            </span>
                            <span aria-hidden>·</span>
                            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                            <span
                              className={`rounded px-1.5 py-0.5 ${
                                item.status === 'publish'
                                  ? 'bg-npb-status-success/15 text-npb-status-success'
                                  : 'bg-npb-status-warning/15 text-npb-status-warning'
                              }`}
                            >
                              {formatContentStatus(item.status)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        aria-label={`Edit ${item.title}`}
                        title="Open in page builder"
                      >
                        <Link href={item.editHref}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center px-4 py-10 text-center">
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-npb-surface-inset text-npb-text-muted">
                  <FileText className="h-6 w-6" aria-hidden />
                </span>
                <p className="font-medium text-npb-text-primary">No content yet</p>
                <p className="mt-1 max-w-sm text-sm text-npb-text-secondary">
                  Create a post or page to see it here.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Button size="sm" asChild className="npb-btn-accent">
                    <Link href="/admin/posts?create=true">New post</Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/admin/pages?create=true">New page</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="admin-surface">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-npb-text-primary">Your theme</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {activeThemeCopy ? (
                <>
                  <ThemeColorPreview
                    settings={(activeTheme as Theme).settings as { colors?: Record<string, string> }}
                    className="h-24 w-full rounded-[var(--npb-radius-surface)] border border-npb-border-default"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-npb-text-primary">{activeThemeCopy.name}</h4>
                    <Badge className="bg-npb-status-success/15 text-npb-status-success">Active</Badge>
                  </div>
                  <p className="mt-1 text-sm text-npb-text-secondary line-clamp-2">
                    {activeThemeCopy.description}
                  </p>
                </>
              ) : (
                <p className="py-3 text-sm text-npb-text-muted">No theme selected yet.</p>
              )}
              <Link href="/admin/themes" className="mt-4 block">
                <Button variant="outline" size="sm" className="w-full">
                  Manage themes
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="admin-surface">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-npb-text-primary">Shortcuts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {SHORTCUTS.map(({ label, href, icon: Icon }) => (
                <Button key={href} variant="outline" size="sm" className="w-full justify-start" asChild>
                  <Link href={href}>
                    <Icon className="mr-2 h-4 w-4 text-npb-accent" aria-hidden />
                    {label}
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
