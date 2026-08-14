import { useCallback, useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import {
  Compass,
  File,
  FilePlus2,
  FileText,
  Image,
  LayoutDashboard,
  Palette,
  Plus,
  Settings,
  Loader,
  AlertCircle,
  Archive,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import { useContentLists } from '@/hooks/useContentLists';
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut';
import { pageEditorPath, postEditorPath } from '@/lib/admin-content-routes';
import { useOptionalActiveSite } from '@/hooks/useActiveSite';
import { appendSiteIdToUrl } from '@/lib/site-api';

type NavigationAction = {
  label: string;
  path: string;
  icon: LucideIcon;
};

type CategoryColor = {
  badge: string;
  icon: string;
};

const NAVIGATION_ACTIONS: NavigationAction[] = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Posts', path: '/admin/posts', icon: FileText },
  { label: 'Pages', path: '/admin/pages', icon: File },
  { label: 'Media library', path: '/admin/media', icon: Image },
  { label: 'Themes', path: '/admin/themes', icon: Palette },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
  { label: 'View site', path: '/', icon: Compass },
];

const CATEGORY_COLORS: Record<string, CategoryColor> = {
  create: {
    badge: 'bg-green-500/10 ring-1 ring-inset ring-green-500/20',
    icon: 'text-green-600 dark:text-green-400',
  },
  navigation: {
    badge: 'bg-blue-500/10 ring-1 ring-inset ring-blue-500/20',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  pages: {
    badge: 'bg-violet-500/10 ring-1 ring-inset ring-violet-500/20',
    icon: 'text-violet-600 dark:text-violet-400',
  },
  posts: {
    badge: 'bg-orange-500/10 ring-1 ring-inset ring-orange-500/20',
    icon: 'text-orange-600 dark:text-orange-400',
  },
};

interface IconBadgeProps {
  icon: LucideIcon;
  category: keyof typeof CATEGORY_COLORS;
}

function IconBadge({ icon: Icon, category }: IconBadgeProps) {
  const { badge, icon } = CATEGORY_COLORS[category];
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${badge}`}>
      <Icon aria-hidden className={`w-4 h-4 ${icon}`} />
    </div>
  );
}

/**
 * Provides authenticated navigation and creation actions from Ctrl/Cmd+K.
 */
export function GlobalCommandPalette(): ReactNode {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const activeSite = useOptionalActiveSite();
  const {
    pages,
    posts,
    pagesLoading,
    postsLoading,
    pagesError,
    postsError,
  } = useContentLists();

  useKeyboardShortcut({
    key: 'k',
    onTrigger: () => setOpen(true),
  });

  const navigate = useCallback(
    (path: string): void => {
      setOpen(false);
      setLocation(path);
    },
    [setLocation],
  );

  const isLoading =
    activeSite?.isLoading || pagesLoading || postsLoading;
  const hasError = Boolean(activeSite?.error || pagesError || postsError);
  const hasContent = pages.length > 0 || posts.length > 0;
  const navigationActions = NAVIGATION_ACTIONS.map((action) =>
    action.label === 'View site'
      ? {
          ...action,
          path: appendSiteIdToUrl('/', activeSite?.activeSiteId),
        }
      : action,
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Quick navigation"
      description="Open a page, post, or admin action"
    >
      <CommandInput placeholder="Search pages, posts, and actions..." />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 text-muted-foreground animate-spin" />
                <span className="text-sm text-muted-foreground">Loading content...</span>
              </>
            ) : hasError ? (
              <>
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span className="text-sm text-muted-foreground">Could not load content.</span>
              </>
            ) : hasContent ? (
              <>
                <Archive className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">No matching results.</span>
              </>
            ) : (
              <>
                <Archive className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">No content yet. Create a page or post below.</span>
              </>
            )}
          </div>
        </CommandEmpty>

        <CommandGroup heading="Create">
          <CommandItem
            value="Create new page"
            onSelect={() => navigate('/admin/pages?create=true')}
          >
            <IconBadge icon={FilePlus2} category="create" />
            <span>Create new page</span>
            <CommandShortcut>Page</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="Create new post"
            onSelect={() => navigate('/admin/posts?create=true')}
          >
            <IconBadge icon={Plus} category="create" />
            <span>Create new post</span>
            <CommandShortcut>Post</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Navigation">
          {navigationActions.map(({ label, path, icon: Icon }) => (
            <CommandItem
              key={path}
              value={label}
              onSelect={() => navigate(path)}
            >
              <IconBadge icon={Icon} category="navigation" />
              <span>{label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Pages">
          {pages.map((page) => (
            <CommandItem
              key={page.id}
              value={`${page.title ?? ''} ${page.slug ?? ''}`}
              onSelect={() => navigate(pageEditorPath(page.id))}
            >
              <IconBadge icon={File} category="pages" />
              <span>{page.title || 'Untitled page'}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Posts">
          {posts.map((post) => (
            <CommandItem
              key={post.id}
              value={`${post.title ?? ''} ${post.slug ?? ''}`}
              onSelect={() => navigate(postEditorPath(post.id))}
            >
              <IconBadge icon={FileText} category="posts" />
              <span>{post.title || 'Untitled post'}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>

      <div className="border-t border-border bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-background px-1 text-[11px] font-medium text-muted-foreground">↑</kbd>
          <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-background px-1 text-[11px] font-medium text-muted-foreground">↓</kbd>
          <span>Navigate</span>
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-background px-1 text-[11px] font-medium text-muted-foreground">↵</kbd>
          <span>Select</span>
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-background px-1.5 text-[11px] font-medium text-muted-foreground">Esc</kbd>
          <span>Close</span>
        </span>
      </div>
    </CommandDialog>
  );
}

