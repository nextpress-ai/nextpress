import React, { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Search, Edit, Trash2, Download, Image, FileText, Film, Music, File } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { AdminListPaginationFooter } from "@/components/admin/admin-list-pagination-footer";
import { useAdminListPagination } from "@/hooks/use-admin-list-pagination";
import { apiRequest } from "@/lib/queryClient";
import { appendSiteIdToUrl } from "@/lib/site-api";
import { useActiveSite } from "@/hooks/useActiveSite";
import { useToast } from "@/hooks/use-toast";
import type { Media } from "@shared/schema-types";

export default function MediaPage() {
  const { activeSiteId } = useActiveSite();
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingMedia, setEditingMedia] = useState<Media | null>(null);
  const [page, setPage] = useState(1);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get media query parameters
  const getQueryParams = () => {
    const params: Record<string, string | number> = { per_page: 20, page, siteId: activeSiteId };
    if (selectedFilter !== "all") {
      params.mime_type = selectedFilter;
    }
    return params;
  };

  const { data: mediaData, isLoading } = useQuery({
    queryKey: ['/api/media', getQueryParams()],
    enabled: !!activeSiteId,
  });

  const visiblePage = useAdminListPagination({
    activeSiteId,
    page,
    setPage,
    totalPages: (mediaData as { total_pages?: number } | undefined)?.total_pages,
  });

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
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
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
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/media/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Media deleted successfully",
      });
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

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this media file?")) {
      deleteMutation.mutate(id);
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

  const filteredMedia = (mediaData as any)?.media?.filter((media: Media) =>
    media.originalName.toLowerCase().includes(search.toLowerCase()) ||
    media.alt?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleFilterChange = (value: string) => {
    setSelectedFilter(value);
    setPage(1);
  };

  return (
    <AdminLayout
      title="Media Library"
      actions={
        <Button
          onClick={() => setIsUploadOpen(true)}
          className="npb-btn-accent"
        >
          <Upload className="w-4 h-4 mr-2" />
          Add New Media
        </Button>
      }
    >
          {/* Filters and Search */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-4 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-npb-text-muted" />
                <Input
                  placeholder="Search media..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <p className="text-xs text-npb-text-muted">Search runs across all items on this site.</p>
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
          </div>

          {/* Media Grid */}
          {(() => {
            if (isLoading) {
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-npb-surface-inset aspect-square rounded-lg mb-2"></div>
                      <div className="bg-npb-surface-inset h-4 rounded mb-1"></div>
                      <div className="bg-npb-surface-inset h-3 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              );
            } else if (filteredMedia.length > 0) {
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {filteredMedia.map((media: Media) => (
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
                          {media.mimeType.startsWith('image/') ? (
                            <img 
                              src={media.url} 
                              alt={media.alt || media.originalName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                             <div className="w-full h-full flex items-center justify-center text-npb-text-muted">
                               {getFileIcon(media.mimeType)}
                </div>
              )}
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
                  ))}
                </div>
              );
            } else {
              return (
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
              );
            }
          })() as any}

          {mediaData ? (
            <AdminListPaginationFooter
              page={visiblePage}
              perPage={20}
              total={(mediaData as { total?: number }).total ?? 0}
              totalPages={(mediaData as { total_pages?: number }).total_pages ?? 1}
              itemLabel="items"
              onPageChange={setPage}
            />
          ) : null}

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
    </AdminLayout>
  );
}