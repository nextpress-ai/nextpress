import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Upload, Edit, Trash2, Download, Image, FileText, Film, Music, File } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  AdminListViewModeToggle,
  ContentListBulkBar,
  ContentListPaginationFooter,
  ContentListToolbar,
  SortableHeader,
} from "@/components/admin/content-list";
import { ConfirmBulkDeleteDialog } from "@/components/admin/confirm-bulk-delete-dialog";
import { useAdminListPagination } from "@/hooks/use-admin-list-pagination";
import { useAdminListViewMode } from "@/hooks/use-admin-list-view-mode";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { apiRequest } from "@/lib/queryClient";
import { appendSiteIdToUrl } from "@/lib/site-api";
import { useActiveSite } from "@/hooks/useActiveSite";
import { useToast } from "@/hooks/use-toast";
import type { Media } from "@shared/schema-types";
import type { ContentListSortOrder, MediaListSortField } from "@shared/content-list-query";
import { DEFAULT_MEDIA_LIST_SORT } from "@shared/content-list-query";

type MediaResponse = {
  media: Media[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

const PER_PAGE = 20;

export default function MediaPage() {
  const {
    activeSiteId,
    isLoading: activeSiteLoading,
    error: activeSiteError,
  } = useActiveSite();
  return (
    <MediaList
      key={activeSiteId || "no-active-site"}
      activeSiteId={activeSiteId}
      activeSiteLoading={activeSiteLoading}
      activeSiteError={activeSiteError}
    />
  );
}

type MediaListProps = {
  activeSiteId: string;
  activeSiteLoading?: boolean;
  activeSiteError?: Error | null;
};

function MediaList({
  activeSiteId,
  activeSiteLoading = false,
  activeSiteError = null,
}: MediaListProps) {
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [sort, setSort] = useState<MediaListSortField>(DEFAULT_MEDIA_LIST_SORT.sort);
  const [order, setOrder] = useState<ContentListSortOrder>(DEFAULT_MEDIA_LIST_SORT.order);
  const { viewMode, setViewMode } = useAdminListViewMode("media");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingMedia, setEditingMedia] = useState<Media | null>(null);
  const [page, setPage] = useState(1);
  const [dragActive, setDragActive] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [idsToDelete, setIdsToDelete] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mediaQueryKey = [
    '/api/media',
    {
      per_page: PER_PAGE,
      page,
      siteId: activeSiteId,
      sort,
      order,
      ...(selectedFilter !== 'all' ? { mime_type: selectedFilter } : {}),
    },
  ];

  const {
    data: mediaData,
    isLoading,
    error: mediaError,
  } = useQuery<MediaResponse>({
    queryKey: mediaQueryKey,
    enabled: !!activeSiteId,
  });

  const visiblePage = useAdminListPagination({
    activeSiteId,
    page,
    setPage,
    totalPages: mediaData?.total_pages,
  });

  const filteredMedia = (mediaData?.media ?? []).filter((media) =>
    media.originalName.toLowerCase().includes(search.toLowerCase()) ||
    media.alt?.toLowerCase().includes(search.toLowerCase())
  );

  const selection = useBulkSelection(filteredMedia);

  useEffect(() => {
    selection.clear();
  }, [page, activeSiteId, selection.clear]);

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(appendSiteIdToUrl('/api/media', activeSiteId), {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }

      return res;
    },
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Media uploaded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/media'] });
      setIsUploadOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload media",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, string> }) => {
      return await apiRequest('PUT', `/api/media/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Media updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/media'] });
      setIsEditOpen(false);
      setEditingMedia(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update media",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => apiRequest('DELETE', `/api/media/${id}`)));
      return ids;
    },
    onSuccess: (ids) => {
      toast({
        title: "Success",
        description:
          ids.length === 1
            ? "Media deleted successfully"
            : `${ids.length} media files deleted successfully`,
      });
      selection.clear();
      setDeleteDialogOpen(false);
      setIdsToDelete([]);
      queryClient.invalidateQueries({ queryKey: ['/api/media'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete media",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    uploadMutation.mutate(formData);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    handleFileUpload(e.dataTransfer.files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleEdit = (media: Media) => {
    setEditingMedia(media);
    setIsEditOpen(true);
  };

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

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingMedia) return;

    const formData = new FormData(e.currentTarget);
    const data = {
      alt: formData.get('alt') as string,
      caption: formData.get('caption') as string,
      description: formData.get('description') as string,
    };

    updateMutation.mutate({ id: editingMedia.id, data });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-6 h-6" />;
    if (mimeType.startsWith('video/')) return <Film className="w-6 h-6" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-6 h-6" />;
    if (mimeType === 'application/pdf') return <FileText className="w-6 h-6" />;
    return <File className="w-6 h-6" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (value: string | Date | null | undefined) =>
    value ? new Date(value).toLocaleDateString() : 'N/A';

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleFilterChange = (value: string) => {
    setSelectedFilter(value);
    setPage(1);
  };

  const handleSortChange = (field: string) => {
    if (sort === field) {
      setOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(field as MediaListSortField);
      setOrder('desc');
    }
    setPage(1);
  };

  const renderThumbnail = (media: Media) =>
    media.mimeType.startsWith('image/') ? (
      <img
        src={media.url}
        alt={media.alt || media.originalName}
        className="w-full h-full object-cover"
      />
    ) : (
      <div className="w-full h-full flex items-center justify-center text-npb-text-muted">
        {getFileIcon(media.mimeType)}
      </div>
    );

  const renderCard = (media: Media) => (
    <Card key={media.id} className="group hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div
          className="aspect-square mb-3 bg-npb-surface-inset rounded-lg overflow-hidden relative cursor-pointer"
          onClick={() => handleEdit(media)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleEdit(media);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={`Open details for ${media.originalName}`}
        >
          {renderThumbnail(media)}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white hover:text-black"
                onClick={() => handleEdit(media)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white hover:text-black"
                onClick={() => window.open(media.url, '_blank')}
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-red-500"
                onClick={() => handleDelete(media.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <button
            type="button"
            className="text-sm font-medium truncate text-left w-full hover:text-npb-accent"
            title={media.originalName}
            onClick={() => handleEdit(media)}
          >
            {media.originalName}
          </button>
          <p className="text-xs text-npb-text-muted">
            {formatFileSize(media.size)}
          </p>
          <Badge variant="secondary" className="text-xs">
            {media.mimeType.split('/')[1].toUpperCase()}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );

  const renderGrid = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {filteredMedia.map(renderCard)}
    </div>
  );

  const renderTable = () => (
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
              aria-label="Select all media on this page"
            />
          </TableHead>
          <TableHead>
            <SortableHeader label="Name" field="originalName" activeField={sort} order={order} onSortChange={handleSortChange} />
          </TableHead>
          <TableHead>
            <SortableHeader label="Type" field="mimeType" activeField={sort} order={order} onSortChange={handleSortChange} />
          </TableHead>
          <TableHead>
            <SortableHeader label="Size" field="size" activeField={sort} order={order} onSortChange={handleSortChange} />
          </TableHead>
          <TableHead>
            <SortableHeader label="Uploaded" field="createdAt" activeField={sort} order={order} onSortChange={handleSortChange} />
          </TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredMedia.map((media) => (
          <TableRow key={media.id} data-state={selection.selectedIds.has(media.id) ? "selected" : undefined}>
            <TableCell>
              <Checkbox
                checked={selection.selectedIds.has(media.id)}
                onCheckedChange={(checked) => selection.toggleOne(media.id, !!checked)}
                aria-label={`Select ${media.originalName}`}
              />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-npb-surface-inset overflow-hidden shrink-0 flex items-center justify-center text-npb-text-muted">
                  {renderThumbnail(media)}
                </div>
                <button
                  type="button"
                  className="font-medium text-npb-text-primary hover:text-npb-accent truncate max-w-64"
                  title={media.originalName}
                  onClick={() => handleEdit(media)}
                >
                  {media.originalName}
                </button>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary" className="text-xs">
                {media.mimeType.split('/')[1].toUpperCase()}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-npb-text-muted">{formatFileSize(media.size)}</TableCell>
            <TableCell className="text-sm">{formatDate(media.createdAt)}</TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end space-x-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(media)}
                        aria-label={`Edit ${media.originalName}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit details</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(media.url, '_blank')}
                        aria-label={`Download ${media.originalName}`}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Download file</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(media.id)}
                        disabled={deleteMutation.isPending}
                        aria-label={`Delete ${media.originalName}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete media</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <AdminLayout
      title="Media Library"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ContentListToolbar
            compact
            value={search}
            placeholder="Search media..."
            onSearchChange={handleSearchChange}
          />
          <AdminListViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          <Button
            onClick={() => setIsUploadOpen(true)}
            className="npb-btn-accent"
          >
            <Upload className="w-4 h-4 mr-2" />
            Add New Media
          </Button>
        </div>
      }
    >
      <Card className="border-0 bg-npb-surface-raised shadow-[var(--npb-shadow-surface)]">
        <CardContent className="pt-4">
          <div className="mb-4 flex items-center gap-4">
            <Select value={selectedFilter} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Media</SelectItem>
                <SelectItem value="image/jpeg">Images</SelectItem>
                <SelectItem value="video/mp4">Videos</SelectItem>
                <SelectItem value="audio/mp3">Audio</SelectItem>
                <SelectItem value="application/pdf">Documents</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ContentListBulkBar
            visible={selection.selectedCount > 0}
            selectedCount={selection.selectedCount}
            itemLabel="media file"
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
          ) : mediaError ? (
            <div role="alert" className="py-8 text-center text-npb-text-muted">
              Could not load media. Try again.
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-npb-surface-inset aspect-square rounded-lg mb-2"></div>
                  <div className="bg-npb-surface-inset h-4 rounded mb-1"></div>
                  <div className="bg-npb-surface-inset h-3 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-npb-surface-inset rounded-full flex items-center justify-center mb-4">
                <Image className="w-8 h-8 text-npb-text-muted" />
              </div>
              <h3 className="text-lg font-medium text-npb-text-primary mb-2">No media files found</h3>
              <p className="text-npb-text-muted mb-4">
                {search ? "Try adjusting your search criteria." : "Upload your first media file to get started."}
              </p>
              <Button onClick={() => setIsUploadOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Media
              </Button>
            </div>
          ) : viewMode === 'cards' ? (
            renderGrid()
          ) : (
            renderTable()
          )}

          {mediaData && !mediaError && activeSiteId && !activeSiteLoading ? (
            <ContentListPaginationFooter
              page={visiblePage}
              perPage={PER_PAGE}
              total={mediaData.total}
              totalPages={mediaData.total_pages}
              itemLabel="items"
              onPageChange={setPage}
            />
          ) : null}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Media</DialogTitle>
          </DialogHeader>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-npb-accent bg-npb-accent/10' : 'border-npb-border-strong'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.txt"
            />
            <Upload className={`mx-auto w-12 h-12 mb-4 ${dragActive ? 'text-npb-accent' : 'text-npb-text-muted'}`} />
            <p className="text-lg font-medium mb-2">
              {dragActive ? 'Drop file here' : 'Drag & drop file here'}
            </p>
            <p className="text-npb-text-muted mb-4">or</p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Choose File'}
            </Button>
            <p className="text-xs text-npb-text-muted mt-4">
              Supported: Images, Videos, Audio, PDF, Text (Max 10MB)
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Media Details</DialogTitle>
          </DialogHeader>
          {editingMedia && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <Label htmlFor="alt">Alt Text</Label>
                <Input
                  id="alt"
                  name="alt"
                  defaultValue={editingMedia.alt || ''}
                  placeholder="Describe the image for accessibility"
                />
              </div>
              <div>
                <Label htmlFor="caption">Caption</Label>
                <Input
                  id="caption"
                  name="caption"
                  defaultValue={editingMedia.caption || ''}
                  placeholder="Caption displayed with the media"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingMedia.description || ''}
                  placeholder="Additional description"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmBulkDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={handleDeleteDialogOpenChange}
        count={idsToDelete.length}
        contentKind="media"
        onConfirm={confirmDelete}
        isPending={deleteMutation.isPending}
      />
    </AdminLayout>
  );
}