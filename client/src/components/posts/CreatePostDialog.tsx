import { useState, useReducer } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { appendSiteIdToUrl } from "@/lib/site-api";
import { useActiveSite } from "@/hooks/useActiveSite";
import { showErrorToast, showSuccessToast } from "@/lib/sonner-toast";
import type { Blog } from "@shared/schema-types";

interface BlogsResponse {
  blogs: Blog[];
  total: number;
}

type DialogStep = "select-blog" | "create-blog";

type FormState = {
  selectedBlogId: string;
  postTitle: string;
  newBlogName: string;
  newBlogDescription: string;
  isCreating: boolean;
  isCreatingBlog: boolean;
};

type FormAction =
  | { type: 'SET_BLOG'; payload: string }
  | { type: 'SET_POST_TITLE'; payload: string }
  | { type: 'SET_BLOG_NAME'; payload: string }
  | { type: 'SET_BLOG_DESC'; payload: string }
  | { type: 'SET_CREATING'; payload: boolean }
  | { type: 'SET_CREATING_BLOG'; payload: boolean }
  | { type: 'RESET' };

const initialFormState: FormState = {
  selectedBlogId: "",
  postTitle: "",
  newBlogName: "",
  newBlogDescription: "",
  isCreating: false,
  isCreatingBlog: false,
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_BLOG':
      return { ...state, selectedBlogId: action.payload };
    case 'SET_POST_TITLE':
      return { ...state, postTitle: action.payload };
    case 'SET_BLOG_NAME':
      return { ...state, newBlogName: action.payload };
    case 'SET_BLOG_DESC':
      return { ...state, newBlogDescription: action.payload };
    case 'SET_CREATING':
      return { ...state, isCreating: action.payload };
    case 'SET_CREATING_BLOG':
      return { ...state, isCreatingBlog: action.payload };
    case 'RESET':
      return initialFormState;
    default:
      return state;
  }
}

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTitle?: string;
}

/**
 * Two-step dialog for creating a new post:
 * Step 1 — Select an existing blog or switch to "create blog" mode
 * Step 2 — (inline) Create a new blog, then return to step 1
 *
 * Once a blog is selected and a title is entered, the dialog creates
 * the post via POST /api/posts and navigates to the page builder.
 */
export function CreatePostDialog({ open, onOpenChange, initialTitle = '' }: CreatePostDialogProps) {
  const [, setLocation] = useLocation();
  const { activeSiteId } = useActiveSite();

  // Dialog state - step is separate for clarity
  const [step, setStep] = useState<DialogStep>("select-blog");
  const [form, dispatchForm] = useReducer(formReducer, {
    ...initialFormState,
    postTitle: initialTitle,
  });

  // Fetch existing blogs
  const { data: blogsData, isLoading: blogsLoading, refetch: refetchBlogs } = useQuery<BlogsResponse>({
    queryKey: ["/api/blogs", { status: "any", siteId: activeSiteId }],
    enabled: open && Boolean(activeSiteId),
  });

  const blogs = blogsData?.blogs ?? [];

  /** Reset all dialog state */
  const resetState = () => {
    setStep("select-blog");
    dispatchForm({ type: 'RESET' });
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) resetState();
    onOpenChange(isOpen);
  };

  /** Create a new blog, then auto-select it */
  const handleCreateBlog = async () => {
    if (!form.newBlogName.trim()) return;

    dispatchForm({ type: 'SET_CREATING_BLOG', payload: true });
    try {
      const response = await apiRequest(
        "POST",
        appendSiteIdToUrl("/api/blogs", activeSiteId),
        {
          name: form.newBlogName.trim(),
          description: form.newBlogDescription.trim() || undefined,
          status: "publish",
        },
      );
      const blog = await response.json();

      showSuccessToast(`"${blog.name}" is ready`);

      // Refresh the blogs list and auto-select the new blog
      await refetchBlogs();
      dispatchForm({ type: 'SET_BLOG', payload: blog.id });
      dispatchForm({ type: 'SET_BLOG_NAME', payload: '' });
      dispatchForm({ type: 'SET_BLOG_DESC', payload: '' });
      setStep("select-blog");
    } catch (err) {
      console.error("Error creating blog:", err);
      showErrorToast("Failed to create blog");
    } finally {
      dispatchForm({ type: 'SET_CREATING_BLOG', payload: false });
    }
  };

  /** Create the post via API and navigate to page builder */
  const handleCreatePost = async () => {
    if (!form.postTitle.trim() || !form.selectedBlogId) return;

    dispatchForm({ type: 'SET_CREATING', payload: true });
    try {
      const response = await apiRequest("POST", "/api/posts", {
        title: form.postTitle.trim(),
        blogId: form.selectedBlogId,
        status: "draft",
        blocks: [],
      });
      const post = await response.json();

      showSuccessToast("Post created successfully");
      handleClose(false);
      setLocation(`/admin/page-builder/post/${post.id}`);
    } catch (err) {
      console.error("Error creating post:", err);
      showErrorToast("Failed to create post");
    } finally {
      dispatchForm({ type: 'SET_CREATING', payload: false });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (step === "create-blog" && form.newBlogName.trim()) {
        handleCreateBlog();
      } else if (step === "select-blog" && form.postTitle.trim() && form.selectedBlogId) {
        handleCreatePost();
      }
    }
  };

  // ── Create Blog sub-form ──────────────────────────────────────────────
  if (step === "create-blog") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create a Blog</DialogTitle>
            <DialogDescription>
              Give your blog a name. You can add more details later.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="blog-name">Blog Name</Label>
              <Input
                id="blog-name"
                placeholder="e.g. Engineering Blog"
                value={form.newBlogName}
                onChange={(e) => dispatchForm({ type: 'SET_BLOG_NAME', payload: e.target.value })}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="blog-desc">Description (optional)</Label>
              <Input
                id="blog-desc"
                placeholder="What is this blog about?"
                value={form.newBlogDescription}
                onChange={(e) => dispatchForm({ type: 'SET_BLOG_DESC', payload: e.target.value })}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStep("select-blog")}>
              Back
            </Button>
            <Button
              onClick={handleCreateBlog}
              disabled={!form.newBlogName.trim() || form.isCreatingBlog}
            >
              {form.isCreatingBlog && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Blog
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Main form: select blog + post title ───────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Post</DialogTitle>
          <DialogDescription>
            Select a blog and enter a title for your new post.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Blog selector */}
          <div className="grid gap-2">
            <Label htmlFor="blog-select">Blog</Label>
            {blogsLoading ? (
              <div className="flex items-center gap-2 text-sm text-npb-text-muted py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading blogs...
              </div>
            ) : blogs.length === 0 ? (
              <div className="text-sm text-npb-text-muted py-2">
                No blogs yet.{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm"
                  onClick={() => setStep("create-blog")}
                >
                  Create your first blog
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Select value={form.selectedBlogId} onValueChange={(v) => dispatchForm({ type: 'SET_BLOG', payload: v })}>
                  <SelectTrigger id="blog-select" className="flex-1">
                    <SelectValue placeholder="Choose a blog..." />
                  </SelectTrigger>
                  <SelectContent>
                    {blogs.map((blog) => (
                      <SelectItem key={blog.id} value={blog.id}>
                        {blog.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setStep("create-blog")}
                  title="Create new blog"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Post title */}
          <div className="grid gap-2">
            <Label htmlFor="post-title">Post Title</Label>
            <Input
              id="post-title"
              placeholder="Enter post title..."
              value={form.postTitle}
              onChange={(e) => dispatchForm({ type: 'SET_POST_TITLE', payload: e.target.value })}
              onKeyDown={handleKeyDown}
              autoFocus={blogs.length > 0}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreatePost}
            disabled={!form.postTitle.trim() || !form.selectedBlogId || form.isCreating}
          >
            {form.isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
