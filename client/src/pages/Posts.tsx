import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Edit, Trash2, Eye, Download } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AdminLayout } from "@/components/AdminLayout";
import { ConfirmBulkDeleteDialog } from "@/components/admin/confirm-bulk-delete-dialog";
import { CreatePostDialog } from "@/components/posts/CreatePostDialog";
import { WordPressImportDialog } from "@/components/import/WordPressImportDialog";
import { apiRequest } from "@/lib/queryClient";
import { useActiveSite } from "@/hooks/useActiveSite";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [idsToDelete, setIdsToDelete] = useState<string[]>([]);
  const [, setLocation] = useLocation();

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: postsData, isLoading } = useQuery<PostsResponse>({
    queryKey: ['/api/posts', { status: 'any', type: 'post', page, per_page: 10, siteId: activeSiteId }],
    enabled: !!activeSiteId,
  });

  const filteredPosts = postsData?.posts?.filter((post: EnrichedPost) =>
    post.title.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const selection = useBulkSelection(filteredPosts);

  useEffect(() => {
    selection.clear();
  }, [page, activeSiteId, selection.clear]);

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => apiRequest("DELETE", `/api/posts/${id}`)));
      return ids;
    },
    onSuccess: (ids) => {
      toast({
        title: "Success",
        description:
          ids.length === 1
            ? "Post deleted successfully"
            : `${ids.length} posts deleted successfully`,
      });
      selection.clear();
      setDeleteDialogOpen(false);
      setIdsToDelete([]);
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete one or more posts",
        variant: "destructive",
      });
    },
  });

  const openDeleteDialog = (ids: string[]) => {
    setIdsToDelete(ids);
    setDeleteDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    openDeleteDialog([id]);
  };

  const confirmDelete = () => {
    if (idsToDelete.length === 0) return;
    deleteMutation.mutate(idsToDelete);
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setIdsToDelete([]);
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
          {selection.selectedCount > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-npb-border-default bg-npb-surface-raised px-4 py-3">
              <span className="text-sm text-npb-text-primary">
                {selection.selectedCount}{" "}
                {selection.selectedCount === 1 ? "post" : "posts"} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => openDeleteDialog(selection.selectedIdList)}
                disabled={deleteMutation.isPending}
              >
                Delete selected
              </Button>
              <Button variant="ghost" size="sm" onClick={selection.clear}>
                Clear selection
              </Button>
            </div>
          )}
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
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        selection.allSelected
                          ? true
                          : selection.someSelected
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={(checked) => selection.toggleAllVisible(!!checked)}
                      aria-label="Select all posts on this page"
                    />
                  </TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPosts.map((post: EnrichedPost) => (
                  <TableRow key={post.id} data-state={selection.selectedIds.has(post.id) ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selection.selectedIds.has(post.id)}
                        onCheckedChange={(checked) => selection.toggleOne(post.id, !!checked)}
                        aria-label={`Select ${post.title}`}
                      />
                    </TableCell>
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
                              <p>Delete post</p>
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
      <ConfirmBulkDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={handleDeleteDialogOpenChange}
        count={idsToDelete.length}
        contentKind="post"
        onConfirm={confirmDelete}
        isPending={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
