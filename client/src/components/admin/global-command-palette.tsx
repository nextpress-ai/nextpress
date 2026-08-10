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

const NAVIGATION_ACTIONS: NavigationAction[] = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Posts', path: '/admin/posts', icon: FileText },
  { label: 'Pages', path: '/admin/pages', icon: File },
  { label: 'Media library', path: '/admin/media', icon: Image },
  { label: 'Themes', path: '/admin/themes', icon: Palette },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
  { label: 'View site', path: '/', icon: Compass },
];

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
          {isLoading
            ? 'Loading content...'
            : hasError
              ? 'Could not load content.'
            : hasContent
              ? 'No matching results.'
              : 'No content yet. Create a page or post below.'}
        </CommandEmpty>

        <CommandGroup heading="Create">
          <CommandItem
            value="Create new page"
            onSelect={() => navigate('/admin/pages?create=true')}
          >
            <FilePlus2 aria-hidden />
            <span>Create new page</span>
            <CommandShortcut>Page</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="Create new post"
            onSelect={() => navigate('/admin/posts?create=true')}
          >
            <Plus aria-hidden />
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
              <Icon aria-hidden />
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
              <File aria-hidden />
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
              <FileText aria-hidden />
              <span>{post.title || 'Untitled post'}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

