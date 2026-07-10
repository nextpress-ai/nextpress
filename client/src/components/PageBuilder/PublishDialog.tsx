import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Share2, Globe, ExternalLink, AlertCircle, FileX } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { VERSION_STALE } from "@shared/content-version";
import type { Post, Page, BlockConfig } from "@shared/schema-types";

const readExpectedVersion = (entity: Post | Page): number => entity.version ?? 0;

interface PublishDialogProps {
  post?: Post | Page;
  blocks: BlockConfig[];
  onPublished?: (updatedData: Post | Page) => void;
  disabled?: boolean;
  contentType?: 'post' | 'page';
}

export default function PublishDialog({
  post,
  blocks,
  onPublished,
  disabled,
  contentType = 'page',
}: PublishDialogProps) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(post?.slug || "");
  const [originalSlug, setOriginalSlug] = useState(post?.slug || "");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update slug when post changes
  useEffect(() => {
    if (post?.slug) {
      setSlug(post.slug);
      setOriginalSlug(post.slug);
    }
  }, [post?.slug]);

  // Force close dialog when post status changes to ensure fresh data on next open
  useEffect(() => {
    if (open && post) {
      // Close dialog to force refresh on next open
      const currentStatus = post.status;
      if (currentStatus !== (post.status === 'publish' ? 'publish' : 'draft')) {
        setOpen(false);
      }
    }
  }, [post?.status, open]);

  // Generate slug from title if empty
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!post) throw new Error("No post data");
      
      const isPage = contentType === 'page';
      const endpoint = isPage ? `/api/pages/${post.id}` : `/api/posts/${post.id}`;
      
      const publishData: Record<string, unknown> = {
        blocks: blocks,
        status: 'publish',
        publishedAt: new Date().toISOString(),
        slug: slug || generateSlug(post.title),
        expectedVersion: readExpectedVersion(post),
      };

      // Include siteId for pages (required field)
      if (isPage && (post as any).siteId) {
        publishData.siteId = (post as any).siteId;
      }

      const response = await apiRequest('PUT', endpoint, publishData);
      return await response.json();
    },
    onSuccess: (updatedData) => {
      const isPage = contentType === 'page';
      toast({
        title: "Published!",
        description: `${isPage ? 'Page' : 'Post'} is now live at /${updatedData.type || (isPage ? 'page' : 'post')}/${updatedData.slug}`,
      });
      setOpen(false);
      onPublished?.(updatedData);
      
      // Invalidate correct queries based on type
      if (isPage) {
        queryClient.invalidateQueries({ queryKey: ['/api/pages'] });
        queryClient.invalidateQueries({ queryKey: [`/api/pages/${post?.id}`] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
        queryClient.invalidateQueries({ queryKey: [`/api/posts/${post?.id}`] });
      }

      if (isPage) {
        window.setTimeout(() => window.location.reload(), 250);
      }
    },
    onError: (error: Error & { code?: string }) => {
      if (error.code === VERSION_STALE) {
        toast({
          title: `${contentType === 'page' ? 'Page' : 'Post'} changed elsewhere`,
          description: 'Reload and try again before publishing.',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: "Publishing failed",
        description: error.message || "Failed to publish page",
        variant: "destructive",
      });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async () => {
      if (!post) throw new Error("No post data");
      
      const isPage = contentType === 'page';
      const endpoint = isPage ? `/api/pages/${post.id}` : `/api/posts/${post.id}`;
      
      const unpublishData: Record<string, unknown> = {
        blocks: blocks,
        status: 'draft',
        publishedAt: null,
        slug: post.slug,
        expectedVersion: readExpectedVersion(post),
      };

      // Include siteId for pages (required field)
      if (isPage && (post as any).siteId) {
        unpublishData.siteId = (post as any).siteId;
      }

      const response = await apiRequest('PUT', endpoint, unpublishData);
      return await response.json();
    },
    onSuccess: (updatedData) => {
      const isPage = contentType === 'page';
      toast({
        title: "Moved to Draft",
        description: `${isPage ? 'Page' : 'Post'} is no longer publicly accessible`,
      });
      setOpen(false);
      onPublished?.(updatedData);
      
      // Invalidate correct queries based on type
      if (isPage) {
        queryClient.invalidateQueries({ queryKey: ['/api/pages'] });
        queryClient.invalidateQueries({ queryKey: [`/api/pages/${post?.id}`] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
        queryClient.invalidateQueries({ queryKey: [`/api/posts/${post?.id}`] });
      }
    },
    onError: (error: Error & { code?: string }) => {
      if (error.code === VERSION_STALE) {
        toast({
          title: `${contentType === 'page' ? 'Page' : 'Post'} changed elsewhere`,
          description: 'Reload and try again before unpublishing.',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: "Failed to unpublish",
        description: error.message || "Failed to move page to draft",
        variant: "destructive",
      });
    },
  });

  const handlePublish = () => {
    // Validate slug
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      toast({
        title: "Invalid slug",
        description: "Slug can only contain lowercase letters, numbers, and hyphens",
        variant: "destructive",
      });
      return;
    }
    
    publishMutation.mutate();
  };

  const handleUnpublish = () => {
    unpublishMutation.mutate();
  };

  const isPublished = post?.status === 'publish';
  const hasSlugChanged = slug !== originalSlug;
  const postType = contentType;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={isPublished ? "outline" : "default"}
          disabled={disabled || !post}
          className={`flex items-center gap-2 ${
            isPublished
              ? 'border-green-600 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800'
              : ''
          }`}
          data-testid="button-publish"
        >
          {isPublished ? (
            <>
              <Globe className="w-4 h-4" />
              Published
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              Publish
            </>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md" data-testid="dialog-publish">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            {isPublished
              ? `Update Published ${contentType === 'page' ? 'Page' : 'Post'}`
              : `Publish ${contentType === 'page' ? 'Page' : 'Post'}`}
          </DialogTitle>
          <DialogDescription>
            {isPublished 
              ? `Update your published ${contentType === 'page' ? 'page' : 'post'} with the latest changes.`
              : `Make your ${contentType === 'page' ? 'page' : 'post'} publicly available with a custom URL.`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isPublished && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Globe className="w-4 h-4 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">Currently Published</p>
                <p className="text-xs text-green-600">
                  Live at: /{postType}/{post?.slug}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const url = `/${postType}/${post?.slug}`;
                  window.open(url, '_blank');
                }}
                className="h-auto p-1 text-green-600"
                data-testid="button-view-published"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="slug">{contentType === 'page' ? 'Page URL' : 'Post URL'}</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-npb-text-muted">/{postType}/</span>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                  placeholder={post ? generateSlug(post.title) : `${contentType}-slug`}
                className="flex-1"
                data-testid="input-slug"
              />
            </div>
            <p className="text-xs text-npb-text-muted">
              Only lowercase letters, numbers, and hyphens allowed
            </p>
          </div>

          {hasSlugChanged && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                 {`Changing the URL will break existing links to this ${contentType}.`}
              </p>
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-medium">{contentType === 'page' ? 'Page' : 'Post'} Status</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm text-npb-text-secondary">
                  {post?.title || `Untitled ${contentType === 'page' ? 'Page' : 'Post'}`}
              </span>
              <Badge variant={isPublished ? "default" : "secondary"}>
                {isPublished ? 'Published' : 'Draft'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-npb-text-secondary">Blocks</span>
              <Badge variant="outline">
                {blocks.length}
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter className={isPublished ? "flex-col-reverse sm:flex-row sm:justify-between" : ""}>
          {isPublished && (
            <Button 
              variant="outline"
              onClick={handleUnpublish}
              disabled={unpublishMutation.isPending}
              className="flex items-center gap-2"
              data-testid="button-unpublish"
            >
              <FileX className="w-4 h-4" />
              {unpublishMutation.isPending ? 'Moving to Draft...' : 'Move to Draft'}
            </Button>
          )}
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button variant="outline" data-testid="button-cancel-publish">
                Cancel
              </Button>
            </DialogClose>
            <Button 
              onClick={handlePublish}
              disabled={publishMutation.isPending}
              data-testid="button-confirm-publish"
            >
              {publishMutation.isPending ? 'Publishing...' : isPublished ? 'Update' : 'Publish'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
