import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Eye, Pencil, Home } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { ConfirmBulkDeleteDialog } from "@/components/admin/confirm-bulk-delete-dialog";
import {
  ContentListBulkBar,
  ContentListPaginationFooter,
  ContentListToolbar,
} from "@/components/admin/content-list";
import { ContentStatusSelect } from "@/components/admin/content-status-select";
import { CreatePageModal } from "@/components/Pages/CreatePageModal";
import { apiRequest } from "@/lib/queryClient";
import { pageEditorPath } from "@/lib/admin-content-routes";
import { appendSiteIdToUrl, buildSiteOptionUrl } from "@/lib/site-api";
import { useActiveSite } from "@/hooks/useActiveSite";
import { useAdminListPagination } from "@/hooks/use-admin-list-pagination";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { useToast } from "@/hooks/use-toast";
import type { Page } from "@shared/schema-types";

type PagesApiResponse = {
  pages: Page[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

type OptionApiResponse = {
  name: string;
  value: string;
};

export default function Pages() {
  const {
    activeSiteId,
    isLoading: activeSiteLoading,
    error: activeSiteError,
  } = useActiveSite();
  return (
    <PagesList
      key={activeSiteId || "no-active-site"}
      activeSiteId={activeSiteId}
      activeSiteLoading={activeSiteLoading}
      activeSiteError={activeSiteError}
    />
  );
}

type PagesListProps = {
  activeSiteId: string;
  activeSiteLoading?: boolean;
  activeSiteError?: Error | null;
};

function PagesList({
  activeSiteId,
  activeSiteLoading = false,
  activeSiteError = null,
}: PagesListProps) {
  const [search, setSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [location, setLocation] = useLocation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [idsToDelete, setIdsToDelete] = useState<string[]>([]);
  const pagesQueryKey = ['/api/pages', { status: 'any', page, per_page: 10, siteId: activeSiteId }];
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check URL param for create modal
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const createParam = urlParams.get('create');
    const titleParam = urlParams.get('title');
    
    if (createParam === 'true') {
      setCreateModalOpen(true);
      // Clean up URL
      const newUrl = titleParam
        ? `/admin/pages?title=${encodeURIComponent(titleParam)}`
        : '/admin/pages';
      setLocation(newUrl, { replace: true });
    }
  }, [location, setLocation]);

  const {
    data: pagesData,
    isLoading,
    error: pagesError,
  } = useQuery<PagesApiResponse>({
    queryKey: pagesQueryKey,
    enabled: !!activeSiteId,
  });
  const visiblePage = useAdminListPagination({
    activeSiteId,
    page,
    setPage,
    totalPages: pagesData?.total_pages,
  });

  const { data: homepageOption } = useQuery<OptionApiResponse | null>({
    queryKey: ['/api/options/homepage_page_slug', { siteId: activeSiteId }],
    enabled: !!activeSiteId,
    queryFn: async () => {
      const response = await fetch(buildSiteOptionUrl({ name: 'homepage_page_slug', siteId: activeSiteId }));
      if (response.status === 404) return null;
      if (!response.ok) throw new Error('Failed to load homepage setting');
      return response.json() as Promise<OptionApiResponse>;
    },
  });

  const filteredPages = pagesData?.pages?.filter((page: Page) =>
    page.title.toLowerCase().includes(search.toLowerCase())
  ) || [];
  const homepageSlug = homepageOption?.value;
  const isHomepage = (target: Page) => !!homepageSlug && target.slug === homepageSlug;
  const deletablePages = filteredPages.filter((page) => !isHomepage(page));

  const selection = useBulkSelection(deletablePages);

  useEffect(() => {
    selection.clear();
  }, [page, activeSiteId, selection.clear]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => apiRequest("DELETE", `/api/pages/${id}`)));
      return ids;
    },
    onSuccess: (ids) => {
      toast({
        title: "Success",
        description:
          ids.length === 1
            ? "Page deleted successfully"
            : `${ids.length} pages deleted successfully`,
      });
      selection.clear();
      setDeleteDialogOpen(false);
      setIdsToDelete([]);
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete one or more pages",
        variant: "destructive",
      });
    },
  });

  const homepageMutation = useMutation({
    mutationFn: async (targetPage: Page) => {
      if (targetPage.status !== 'publish') {
        throw new Error('Only published pages can be set as the homepage');
      }
      if (!targetPage.slug) {
        throw new Error('Page slug is required to set the homepage');
      }

      const response = await apiRequest(
        'POST',
        appendSiteIdToUrl('/api/options', activeSiteId),
        {
          name: 'homepage_page_slug',
          value: targetPage.slug,
        },
      );
      return response.json() as Promise<OptionApiResponse>;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Homepage updated successfully",
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/options/homepage_page_slug', { siteId: activeSiteId }],
      });
      queryClient.invalidateQueries({ queryKey: ['/api/public/homepage'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pages'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update homepage",
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

  const handleNewPage = () => {
    setCreateModalOpen(true);
  };

  const handleView = (page: Page) => {
    // Published pages: open public URL. Draft/preview: open preview by ID so content is visible.
    if (page.status === 'publish' && page.siteId && page.slug) {
      window.open(`/sites/${page.siteId}/${page.slug}`, '_blank');
    } else {
      window.open(`/preview/page/${page.id}`, '_blank');
    }
  };

  const handlePageBuilder = (pageId: string) => {
    setLocation(pageEditorPath(pageId));
  };

  const handleSetHomepage = (targetPage: Page) => {
    homepageMutation.mutate(targetPage);
  };

  return (
    <AdminLayout
      title="Pages"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ContentListToolbar
            compact
            value={search}
            placeholder="Search pages..."
            onSearchChange={handleSearchChange}
          />
          <Button className="npb-btn-accent" onClick={handleNewPage}>
            <Plus className="w-4 h-4 mr-2" />
            Add New Page
          </Button>
        </div>
      }
    >
          <Card className="border-0 bg-npb-surface-raised shadow-[var(--npb-shadow-surface)]">
            <CardContent className="pt-4">
              <ContentListBulkBar
                visible={selection.selectedCount > 0}
                selectedCount={selection.selectedCount}
                itemLabel="page"
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
              ) : pagesError ? (
                <div role="alert" className="py-8 text-center text-npb-text-muted">
                  Could not load pages. Try again.
                </div>
              ) : isLoading ? (
                <div role="status" className="py-8 text-center text-npb-text-muted">
                  Loading pages...
                </div>
              ) : filteredPages.length === 0 ? (
                <div className="text-center py-8 text-npb-text-muted">
                  No pages found. <Button variant="link" onClick={handleNewPage}>Create your first page</Button>
                </div>
              ) : (
                <Table className="admin-list-table">
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
                          aria-label="Select all pages on this page"
                        />
                      </TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPages.map((page: Page) => (
                      <TableRow key={page.id} data-state={selection.selectedIds.has(page.id) ? "selected" : undefined}>
                        <TableCell>
                          <Checkbox
                            checked={selection.selectedIds.has(page.id)}
                            onCheckedChange={(checked) => selection.toggleOne(page.id, !!checked)}
                            disabled={isHomepage(page)}
                            aria-label={
                              isHomepage(page)
                                ? `${page.title} is the homepage and cannot be deleted`
                                : `Select ${page.title}`
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-npb-text-primary flex items-center gap-2">
                              <Link href={pageEditorPath(page.id)} className="hover:text-npb-accent">
                                {page.title}
                              </Link>
                              {(page.other as any)?.isBlogPage && (
                                <Badge variant="outline" className="text-xs font-normal text-blue-600 border-blue-300">Blog</Badge>
                              )}
                              {page.slug === homepageSlug && (
                                <Badge variant="outline" className="text-xs font-normal text-green-700 border-green-300">Homepage</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <ContentStatusSelect
                            contentKind="page"
                            contentId={page.id}
                            status={page.status || 'draft'}
                            version={page.version}
                            queryKeys={[pagesQueryKey, ['/api/pages']]}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{page.createdAt ? new Date(page.createdAt).toLocaleDateString() : 'N/A'}</div>
                            <div className="text-npb-text-muted">
                              {page.createdAt ? new Date(page.createdAt).toLocaleTimeString() : 'N/A'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleView(page)}
                              aria-label={page.status === 'publish' ? `View published page ${page.title}` : `Preview page ${page.title}`}
                              title={page.status === 'publish' ? 'View published page' : 'Preview page'}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handlePageBuilder(page.id)}
                              aria-label={`Edit ${page.title} with Page Builder`}
                              title="Edit with Page Builder"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetHomepage(page)}
                              aria-label={
                                page.status === 'publish'
                                  ? `Set ${page.title} as homepage`
                                  : `Publish ${page.title} before setting homepage`
                              }
                              title={page.status === 'publish' ? 'Set as homepage' : 'Publish page before setting homepage'}
                              disabled={
                                page.status !== 'publish' ||
                                page.slug === homepageSlug ||
                                homepageMutation.isPending
                              }
                            >
                              <Home className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDelete(page.id)}
                              disabled={deleteMutation.isPending || isHomepage(page)}
                              aria-label={
                                isHomepage(page)
                                  ? `Cannot delete ${page.title} while it is the homepage`
                                  : `Delete page ${page.title}`
                              }
                              title={
                                isHomepage(page)
                                  ? "Choose a different homepage before deleting this page"
                                  : "Delete page"
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {pagesData && !pagesError && activeSiteId && !activeSiteLoading ? (
                <ContentListPaginationFooter
                  page={visiblePage}
                  perPage={10}
                  total={pagesData.total}
                  totalPages={pagesData.total_pages}
                  itemLabel="pages"
                  onPageChange={setPage}
                />
              ) : null}
            </CardContent>
          </Card>

      {/* Create Page Modal */}
      <CreatePageModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        initialTitle={new URLSearchParams(window.location.search).get('title') || ''}
      />

      <ConfirmBulkDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={handleDeleteDialogOpenChange}
        count={idsToDelete.length}
        contentKind="page"
        onConfirm={confirmDelete}
        isPending={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}
