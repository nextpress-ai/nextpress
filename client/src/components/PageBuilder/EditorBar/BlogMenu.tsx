import { ReactNode, useState } from 'react';
import { useLocation } from 'wouter';
import { Pen, Plus, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useContentLists } from '@/hooks/useContentLists';
import { postEditorPath } from '@/lib/admin-content-routes';
import { formatContentStatus } from '@/lib/format-content-status';
import { CreateContentDialog } from './CreateContentDialog';

interface BlogMenuProps {
  children: ReactNode;
  currentPostId?: string;
  blogId?: string;
  /** Opens in-builder create post dialog instead of navigating away */
  onCreateNewPost?: () => void;
}

/**
 * BlogMenu - Dropdown for browsing and creating blog posts
 * Opens Command palette for searchable post list
 * Can filter posts by blogId if provided
 */
export function BlogMenu({
  children,
  currentPostId,
  blogId,
  onCreateNewPost,
}: BlogMenuProps) {
  const [, setLocation] = useLocation();
  const [showCommand, setShowCommand] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const { posts, postsLoading } = useContentLists({ blogId });

  const handlePostSelect = (postId: string) => {
    setShowCommand(false);
    setLocation(postEditorPath(postId));
  };

  const handleCreateNew = () => {
    if (onCreateNewPost) {
      onCreateNewPost();
      return;
    }
    setShowCreate(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setShowCommand(true)}>
            <Search className="w-4 h-4" />
            Browse Posts
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCreateNew}>
            <Plus className="w-4 h-4" />
            Create New Post
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Command Palette for browsing posts */}
      <CommandDialog
        open={showCommand}
        onOpenChange={setShowCommand}
        title="Search Posts"
        description="Search and select a post to edit">
        <CommandInput placeholder="Search posts..." />
        <CommandList>
          <CommandEmpty>
            {postsLoading ? 'Loading posts...' : 'No posts found.'}
          </CommandEmpty>
          <CommandGroup heading={blogId ? 'Blog Posts' : 'All Posts'}>
            {posts.map((post) => (
              <CommandItem
                key={post.id}
                value={`${post.title ?? ''} ${post.slug ?? ''} ${post.id}`}
                onSelect={() => handlePostSelect(post.id)}
                className={currentPostId === post.id ? 'bg-accent' : ''}>
                <Pen className="w-4 h-4" />
                <span>{post.title}</span>
                {post.status && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatContentStatus(post.status)}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Fallback create flow when builder does not supply in-place dialog */}
      {!onCreateNewPost ? (
        <CreateContentDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          type="post"
        />
      ) : null}
    </>
  );
}
