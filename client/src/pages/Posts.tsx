import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Eye, Download } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AdminLayout } from "@/components/AdminLayout";
import { CreatePostDialog } from "@/components/posts/CreatePostDialog";
import { WordPressImportDialog } from "@/components/import/WordPressImportDialog";
import { apiRequest } from "@/lib/queryClient";
import { appendSiteIdToUrl } from "@/lib/site-api";
import { useActiveSite } from "@/hooks/useActiveSite";
import { useToast } from "@/hooks/use-toast";
import type { EnrichedPost } from "@shared/posts/post-other";

interface PostsResponse {
  posts: EnrichedPost[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export default function Posts() {
  const { activeSiteId } = useActiveSite();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [, setLocation] = useLocation();

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: postsData, isLoading } = useQuery<PostsResponse>({
    queryKey: ['/api/posts', { status: 'any', type: 'post', page, per_page: 10, siteId: activeSiteId }],
    enabled: !!activeSiteId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/posts/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Post deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this post?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (postId: string) => {
    setLocation(`/admin/page-builder/post/${postId}`);
  };

  const handleNewPost = () => {
    setShowCreateDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      publish: "default",
      draft: "secondary",
      private: "outline",
      trash: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const filteredPosts = postsData?.posts?.filter((post: EnrichedPost) =>
    post.title.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <AdminLayout
      title="Posts"
      actions={
        <>
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <Download className="w-4 h-4 mr-2" />
            Import from WordPress
          </Button>
          <Button
            className="bg-npb-accent hover:bg-npb-accent-hover text-white"
            onClick={handleNewPost}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Post
          </Button>
        </>
      }
    >
      <Card className="border-0 bg-npb-surface-raised shadow-[var(--npb-shadow-surface)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Posts</CardTitle>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-npb-text-muted w-4 h-4" />
                <Input
                  placeholder="Search posts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-npb-text-muted">Loading posts...</div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-8 text-npb-text-muted">
              No posts found. <Button variant="link" onClick={handleNewPost}>Create your first post</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPosts.map((post: EnrichedPost) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-npb-text-primary">{post.title}</span>
                          {post.isImported && (
                            <Badge variant="outline" className="text-xs">
                              Imported
                            </Badge>
                          )}
                        </div>
                        {post.excerpt && (
                          <div className="text-sm text-npb-text-muted mt-1">
                            {post.excerpt.substring(0, 100)}...
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(post.status || 'draft')}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'N/A'}</div>
                        <div className="text-npb-text-muted">
                          {post.createdAt ? new Date(post.createdAt).toLocaleTimeString() : 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(post.status === 'publish' && post.slug ? `/post/${post.slug}` : `/preview/post/${post.id}`, '_blank')}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View post in new tab</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(post.id)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit in page builder</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(post.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete post permanently</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {postsData && postsData.total_pages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-npb-text-muted">
                Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, postsData.total)} of {postsData.total} posts
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= postsData.total_pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CreatePostDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
      <WordPressImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
      />
    </AdminLayout>
  );
}
