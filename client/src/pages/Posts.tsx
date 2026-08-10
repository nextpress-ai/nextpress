import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Eye, Download, GripVertical } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AdminLayout } from "@/components/AdminLayout";
import { ConfirmBulkDeleteDialog } from "@/components/admin/confirm-bulk-delete-dialog";
import {
  ContentListBulkBar,
  ContentListPaginationFooter,
  ContentListToolbar,
  SortableHeader,
  AdminListViewModeToggle,
  ContentCardGrid,
} from "@/components/admin/content-list";
import { ContentStatusSelect } from "@/components/admin/content-status-select";
import { CreatePostDialog } from "@/components/posts/CreatePostDialog";
import { WordPressImportDialog } from "@/components/import/WordPressImportDialog";
import { apiRequest } from "@/lib/queryClient";
import { postEditorPath } from "@/lib/admin-content-routes";
import { useActiveSite } from "@/hooks/useActiveSite";
import { useAdminListPagination } from "@/hooks/use-admin-list-pagination";
import { useAdminListViewMode } from "@/hooks/use-admin-list-view-mode";
import { useReorderList } from "@/hooks/use-reorder-list";
import type { ContentListSortOrder } from "@shared/content-list-query";
import { DEFAULT_POST_LIST_SORT } from "@shared/content-list-query";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { useToast } from "@/hooks/use-toast";
import type { EnrichedPost } from "@shared/posts/post-other";
import { Badge } from "@/components/ui/badge";

type PostsResponse = {
  posts: EnrichedPost[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

export default function Posts() {
  const {
    activeSiteId,
    isLoading: activeSiteLoading,
    error: activeSiteError,
  } = useActiveSite();
  return (
    <PostsList
      key={activeSiteId || "no-active-site"}
      activeSiteId={activeSiteId}
      activeSiteLoading={activeSiteLoading}
      activeSiteError={activeSiteError}
    />
  );
}

type PostsListProps = {
  activeSiteId: string;
  activeSiteLoading?: boolean;
  activeSiteError?: Error | null;
};

function PostsList({
  activeSiteId,
  activeSiteLoading = false,
  activeSiteError = null,
}: PostsListProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(DEFAULT_POST_LIST_SORT.sort);
  const [order, setOrder] = useState<ContentListSortOrder>(DEFAULT_POST_LIST_SORT.order);
  const { viewMode, setViewMode } = useAdminListViewMode("posts");
  const [page, setPage] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [idsToDelete, setIdsToDelete] = useState<string[]>([]);
  const [location, setLocation] = useLocation();
  const postsQueryKey = [
    '/api/posts',
    {
      status: 'any',
      page,
      per_page: 10,
      siteId: activeSiteId,
      sort,
      order,
      ...(search.trim() ? { search: search.trim() } : {}),
    },
  ];

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const createParam = urlParams.get('create');
    const titleParam = urlParams.get('title');

    if (createParam === 'true') {
      setShowCreateDialog(true);
      const newUrl = titleParam
        ? `/admin/posts?title=${encodeURIComponent(titleParam)}`
        : '/admin/posts';
      setLocation(newUrl, { replace: true });
    }
  }, [location, setLocation]);

  const {
    data: postsData,
    isLoading,
    error: postsError,
  } = useQuery<PostsResponse>({
    queryKey: postsQueryKey,
    enabled: !!activeSiteId,
  });
  const visiblePage = useAdminListPagination({
    activeSiteId,
    page,
    setPage,
    totalPages: postsData?.total_pages,
  });

  const posts = postsData?.posts ?? [];
  const selection = useBulkSelection(posts);

  const reorderEnabled = sort === 'menuOrder' && order === 'asc';
  const reorderMutation = useMutation({
    mutationFn: async (items: Array<{ id: string; menuOrder: number }>) => {
      await apiRequest('PATCH', '/api/posts/reorder', {
        siteId: activeSiteId,
        items,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Could not update post order',
        variant: 'destructive',
      });
    },
  });
  const reorder = useReorderList({
    items: posts,
    enabled: reorderEnabled,
    onReorder: reorderMutation.mutateAsync,
  });

  useEffect(() => {
    selection.clear();
  }, [page, activeSiteId, selection.clear]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleSortChange = (field: string) => {
    if (sort === field) {
      setOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(field as typeof sort);
      setOrder(field === 'menuOrder' ? 'asc' : 'desc');
    }
    setPage(1);
  };

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

  const handleNewPost = () => {
    setShowCreateDialog(true);
  };

  const initialCreateTitle = new URLSearchParams(window.location.search).get('title') || '';

  return (
    <AdminLayout
      title="Posts"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ContentListToolbar
            compact
            value={search}
            placeholder="Search posts..."
            onSearchChange={handleSearchChange}
          />
          <AdminListViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
            <Download className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button className="npb-btn-accent" onClick={handleNewPost}>
            <Plus className="w-4 h-4 mr-2" />
            Add New Post
          </Button>
        </div>
      }
    >
      <Card className="border-0 bg-npb-surface-raised shadow-[var(--npb-shadow-surface)]">
        <CardContent className="pt-4">
          <ContentListBulkBar
            visible={selection.selectedCount > 0}
            selectedCount={selection.selectedCount}
            itemLabel="post"
            onDelete={() => openDeleteDialog(selection.selectedIdList)}
            onClear={selection.clear}
            deletePending={deleteMutation.isPending}
          />
          {activeSiteLoading ? (
            <div role="status" className="py-8 text-center text-npb-text-muted">
              Loading site...
            </div>
          ) : activeSiteError ? (
            <div role="alert" className="py-8 text-center text-npb-text-muted">
              Could not load active site.
            </div>
          ) : !activeSiteId ? (
            <div role="status" className="py-8 text-center text-npb-text-muted">
              No active site available.
            </div>
          ) : postsError ? (
            <div role="alert" className="py-8 text-center text-npb-text-muted">
              Could not load posts. Try again.
            </div>
          ) : isLoading ? (
            <div role="status" className="py-8 text-center text-npb-text-muted">
              Loading posts...
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 text-npb-text-muted">
              No posts found. <Button variant="link" onClick={handleNewPost}>Create your first post</Button>
            </div>
          ) : viewMode === 'cards' ? (
            <ContentCardGrid
              items={posts}
              hrefForItem={(item) => postEditorPath(item.id)}
              renderMeta={(item) => (
                <span>{item.status || 'draft'} · {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'No date'}</span>
              )}
              renderActions={(item) => (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={postEditorPath(item.id)}>
                      <Edit className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      window.open(
                        item.status === 'publish' && item.slug
                          ? `/post/${item.slug}`
                          : `/preview/post/${item.id}`,
                        '_blank',
                      )
                    }>
                    <Eye className="w-4 h-4" />
                  </Button>
                </>
              )}
            />
          ) : (
            <Table className="admin-list-table">
              <TableHeader>
                <TableRow>
                  {reorderEnabled ? (
                    <TableHead className="w-8" aria-label="Drag to reorder" />
                  ) : null}
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
                  <TableHead>
                    <SortableHeader label="Title" field="title" activeField={sort} order={order} onSortChange={handleSortChange} />
                  </TableHead>
                  <TableHead>
                    <SortableHeader label="Status" field="status" activeField={sort} order={order} onSortChange={handleSortChange} />
                  </TableHead>
                  <TableHead>
                    <SortableHeader label="Date" field="updatedAt" activeField={sort} order={order} onSortChange={handleSortChange} />
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post: EnrichedPost) => (
                  <TableRow
                    key={post.id}
                    data-state={selection.selectedIds.has(post.id) ? "selected" : undefined}
                    className={reorder.dragOverId === post.id ? 'bg-npb-accent/5' : undefined}
                    draggable={reorderEnabled}
                    onDragStart={reorder.onDragStart(post.id)}
                    onDragOver={reorder.onDragOver(post.id)}
                    onDrop={reorder.onDrop(post.id)}
                    onDragEnd={reorder.onDragEnd}>
                    {reorderEnabled ? (
                      <TableCell className="w-8 cursor-grab text-npb-text-muted">
                        <GripVertical className="h-4 w-4" aria-hidden />
                      </TableCell>
                    ) : null}
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
                          <Link href={postEditorPath(post.id)} className="font-medium text-npb-text-primary hover:text-npb-accent">
                            {post.title}
                          </Link>
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
                      <ContentStatusSelect
                        contentKind="post"
                        contentId={post.id}
                        status={post.status || 'draft'}
                        version={post.version}
                        queryKeys={[postsQueryKey, ['/api/posts']]}
                      />
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
                                aria-label={`View ${post.title} in new tab`}
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
                                asChild
                              >
                                <Link href={postEditorPath(post.id)} aria-label={`Edit ${post.title}`}>
                                  <Edit className="w-4 h-4" />
                                </Link>
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
                                aria-label={`Delete post ${post.title}`}
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

          {postsData && !postsError && activeSiteId && !activeSiteLoading ? (
            <ContentListPaginationFooter
              page={visiblePage}
              perPage={10}
              total={postsData.total}
              totalPages={postsData.total_pages}
              itemLabel="posts"
              onPageChange={setPage}
            />
          ) : null}
        </CardContent>
      </Card>

      <CreatePostDialog
        key={`${showCreateDialog}-${initialCreateTitle}`}
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        initialTitle={initialCreateTitle}
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
