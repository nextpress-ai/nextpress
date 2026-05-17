import { useMemo, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Image as ImageIcon, Film, Music, File, Upload } from "lucide-react";
import { ImageDropzone } from "@/components/ui/image-dropzone";
import type { Media } from "@shared/schema-types";
import { isImageMedia } from "@/lib/is-image-asset";

type MediaKind = "any" | "image" | "video" | "audio";

/** Maps MediaKind to the file accept string for the upload dropzone */
const ACCEPT_BY_KIND: Record<MediaKind, string> = {
  any: "image/*,video/*,audio/*,.pdf,.txt",
  // Explicit gif/svg so pickers that ignore image/* still offer these
  image: "image/*,.gif,.svg,.svgz",
  video: "video/*",
  audio: "audio/*",
};

export interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: Media) => void;
  kind?: MediaKind;
}

export default function MediaPickerDialog({ open, onOpenChange, onSelect, kind = "any" }: MediaPickerDialogProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"library" | "upload">("library");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/media", { per_page: 100, page: 1 }],
  });

  const items: Media[] = (data as any)?.media || [];

  const filtered = useMemo(() => {
    const matchesKind = (m: Media) => {
      if (kind === "any") return true;
      if (kind === "image") return isImageMedia(m);
      return m.mimeType?.startsWith(kind + "/");
    };
    const matchesSearch = (m: Media) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        m.originalName?.toLowerCase().includes(q) ||
        m.filename?.toLowerCase().includes(q) ||
        m.alt?.toLowerCase().includes(q) ||
        m.caption?.toLowerCase().includes(q) ||
        m.mimeType?.toLowerCase().includes(q)
      );
    };
    return items.filter((m) => matchesKind(m) && matchesSearch(m));
  }, [items, kind, search]);

  /**
   * Handles file upload via the dropzone. Uploads to /api/media,
   * invalidates the media query cache, then auto-selects the new item.
   */
  const handleUpload = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/media", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Failed to upload file");
    }

    const mediaItem: Media = await response.json();

    // Refresh the library so the new item appears
    await queryClient.invalidateQueries({ queryKey: ["/api/media"] });

    // Auto-select the newly uploaded item and close
    onSelect(mediaItem);
    onOpenChange(false);

    return mediaItem.url;
  }, [queryClient, onSelect, onOpenChange]);

  const renderThumb = (m: Media) => {
    if (isImageMedia(m)) {
      return (
        <img
          src={m.url}
          alt={m.alt || m.originalName || m.filename}
          className="w-full h-28 object-cover rounded"
        />
      );
    }
    const Icon = m.mimeType?.startsWith("video/")
      ? Film
      : m.mimeType?.startsWith("audio/")
      ? Music
      : File;
    return (
      <div className="w-full h-28 flex items-center justify-center bg-muted rounded">
        <Icon className="w-10 h-10 text-muted-foreground" />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Select media</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "library" | "upload")}>
          <TabsList>
            <TabsTrigger value="library">
              <ImageIcon className="w-4 h-4 mr-1.5" />
              Library
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="w-4 h-4 mr-1.5" />
              Upload
            </TabsTrigger>
          </TabsList>

          {/* Library Tab - existing browse behavior */}
          <TabsContent value="library">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Search media..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                {isLoading ? "Loading..." : `${filtered.length} item${filtered.length === 1 ? "" : "s"}`}
              </div>
            </div>
            <ScrollArea className="mt-4 h-96">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pr-2">
                {filtered.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="group text-left border rounded hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    onClick={() => {
                      onSelect(m);
                      onOpenChange(false);
                    }}
                  >
                    <div className="relative">{renderThumb(m)}</div>
                    <div className="p-2">
                      <div className="text-sm font-medium truncate" title={m.originalName || m.filename}>
                        {m.originalName || m.filename}
                      </div>
                      <div className="text-xs text-muted-foreground truncate" title={m.mimeType}>
                        {m.mimeType}
                      </div>
                    </div>
                  </button>
                ))}
                {!isLoading && filtered.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                    <div>No media found</div>
                  </div>
                ) : null}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Upload Tab - new upload capability */}
          <TabsContent value="upload">
            <div className="py-4">
              <ImageDropzone
                onUpload={handleUpload}
                accept={ACCEPT_BY_KIND[kind]}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
