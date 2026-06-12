import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, File, MessageCircle, Users, Plus, ExternalLink } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ThemeColorPreview } from '@/components/themes/theme-color-preview';
import { Link } from 'wouter';
import type { Theme } from '@shared/schema-types';

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: recentPosts, isLoading: postsLoading } = useQuery({
    queryKey: ['/api/posts', { status: 'publish', per_page: 5 }],
  });

  const { data: activeTheme } = useQuery({
    queryKey: ['/api/themes/active'],
  });

  const statsItems = [
    { label: 'Posts', value: (stats as { posts?: number })?.posts ?? 0, icon: FileText, href: '/admin/posts' },
    { label: 'Pages', value: (stats as { pages?: number })?.pages ?? 0, icon: File, href: '/admin/pages' },
    { label: 'Comments', value: (stats as { comments?: number })?.comments ?? 0, icon: MessageCircle, href: '/admin/comments' },
    { label: 'Users', value: (stats as { users?: number })?.users ?? 0, icon: Users, href: '/admin/users' },
  ];

  const headerActions = (
    <>
      <Link href="/admin/posts">
        <Button size="sm" className="bg-npb-accent hover:bg-npb-accent-hover text-white">
          <Plus className="mr-2 h-4 w-4" />
          New Post
        </Button>
      </Link>
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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {statsItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href}>
              <div className="rounded-[var(--npb-radius-surface)] bg-npb-surface-raised p-4 transition-colors hover:bg-npb-surface-inset">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-npb-text-primary">
                      {statsLoading ? '…' : item.value}
                    </p>
                    <p className="text-sm text-npb-text-muted">{item.label}</p>
                  </div>
                  <Icon className="h-5 w-5 text-npb-accent" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-0 bg-npb-surface-raised shadow-[var(--npb-shadow-surface)] lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-npb-text-primary">Recent Posts</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {postsLoading ? (
              <div className="py-8 text-center text-npb-text-muted">Loading…</div>
            ) : (recentPosts as { posts?: Array<{ id: string; title: string; excerpt?: string; createdAt: string; status: string }> })?.posts?.length ? (
              <div className="divide-y divide-npb-divider">
                {(recentPosts as { posts: Array<{ id: string; title: string; excerpt?: string; createdAt: string; status: string }> }).posts.map((post) => (
                  <div key={post.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/posts`}>
                        <h4 className="truncate font-medium text-npb-text-primary hover:text-npb-accent">
                          {post.title}
                        </h4>
                      </Link>
                      {post.excerpt ? (
                        <p className="mt-1 line-clamp-2 text-sm text-npb-text-muted">{post.excerpt}</p>
                      ) : null}
                      <div className="mt-2 flex items-center gap-3 text-xs text-npb-text-muted">
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 ${
                            post.status === 'publish'
                              ? 'bg-npb-status-success/15 text-npb-status-success'
                              : 'bg-npb-status-warning/15 text-npb-status-warning'
                          }`}
                        >
                          {post.status === 'publish' ? 'Published' : 'Draft'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-npb-text-muted">
                No posts yet.{' '}
                <Link href="/admin/posts" className="text-npb-accent hover:underline">
                  Create your first post
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 bg-npb-surface-raised shadow-[var(--npb-shadow-surface)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-npb-text-primary">Active Theme</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {(activeTheme as Theme | undefined)?.name ? (
              <>
                <ThemeColorPreview
                  settings={(activeTheme as Theme).settings as { colors?: Record<string, string> }}
                  className="h-28 w-full rounded-[var(--npb-radius-surface)]"
                />
                <h4 className="mt-4 font-semibold text-npb-text-primary">
                  {(activeTheme as Theme).name}
                </h4>
                {(activeTheme as Theme).description ? (
                  <p className="mt-1 text-sm text-npb-text-muted line-clamp-2">
                    {(activeTheme as Theme).description}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="py-4 text-sm text-npb-text-muted">No theme active.</p>
            )}
            <Link href="/admin/themes" className="mt-4 block">
              <Button variant="outline" size="sm" className="w-full">
                Manage Themes
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
