import { useState } from "react";
import type { BlockConfig, BlockContent, Media } from "@shared/schema-types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Image as ImageIcon } from "lucide-react";
import MediaPickerDialog from "@/components/media/MediaPickerDialog";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsLabel } from "../../shared";
import { MediaUrlField } from "../shared/media-url-field";
import { useSettingsState } from "../useSettingsState";
import {
  type GalleryData,
  type GalleryImage,
  DEFAULT_DATA,
  readGalleryData,
  resolveGalleryColumns,
} from "@shared/gallery-model";

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface GallerySettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

export function GallerySettings({ block, onUpdate }: GallerySettingsProps) {
  const { accessor, rerender } = useSettingsState<GalleryData>({
    block,
    onUpdate,
    defaultContent: DEFAULT_DATA,
  });
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const galleryData = accessor
    ? (accessor.getContent() as GalleryData)
    : readGalleryData(block.content);

  const images: GalleryImage[] = Array.isArray(galleryData?.images)
    ? galleryData.images
    : [];

  const updateContent = (updates: Partial<GalleryData>) => {
    if (accessor) {
      const current = accessor.getContent() as GalleryData;
      accessor.setContent({ ...current, ...updates });
      rerender();
    } else if (onUpdate) {
      const currentData = readGalleryData(block.content);
      onUpdate({
        content: {
          kind: 'structured',
          data: {
            ...currentData,
            ...updates,
          },
        } as BlockContent,
      });
    }
  };

  const updateImages = (newImages: GalleryImage[]) => {
    updateContent({
      images: newImages,
      columns: resolveGalleryColumns({
        imageCount: newImages.length,
        columns: galleryData?.columns,
      }),
    });
  };

  const addImage = (selectedImage: Media) => {
    const currentImages = accessor
      ? (accessor.getContent() as GalleryData).images ?? []
      : images;
    const newImage: GalleryImage = {
      id: `${selectedImage.id}-${Date.now()}`,
      url: selectedImage.url,
      alt: selectedImage.alt || selectedImage.originalName || selectedImage.filename,
      caption: '',
      sizeSlug: 'large',
    };
    const newImages = [...currentImages, newImage];
    updateImages(newImages);
    setSelectedImageIndex(newImages.length - 1);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    updateImages(newImages);
    setSelectedImageIndex((prev) => {
      if (prev === null || newImages.length === 0) {
        return null;
      }
      if (index < prev) {
        return prev - 1;
      }
      if (index === prev) {
        return Math.min(prev, newImages.length - 1);
      }
      return prev;
    });
  };

  const updateImage = (index: number, updates: Partial<GalleryImage>) => {
    const newImages = images.map((img, i) => i === index ? { ...img, ...updates } : img);
    updateImages(newImages);
  };

  const activeImageIndex =
    selectedImageIndex !== null && selectedImageIndex < images.length
      ? selectedImageIndex
      : null;
  const activeImage = activeImageIndex !== null ? images[activeImageIndex] : null;

  return (
    <div className="space-y-4">
      <CollapsibleCard title="Content" icon={ImageIcon} defaultOpen={true}>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <SettingsLabel>Images ({images.length})</SettingsLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPickerOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Images
            </Button>
          </div>

          <MediaPickerDialog
            open={isPickerOpen}
            onOpenChange={setPickerOpen}
            kind="image"
            onSelect={addImage}
          />

          {images.length > 0 && (
            <div
              className="flex flex-wrap gap-2 max-h-32 overflow-y-auto"
              aria-label="Gallery thumbnails"
            >
              {images.map((image, index) => (
                <button
                  key={image.id || index}
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                  className={cn(
                    "relative rounded border p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-npb-focus",
                    activeImageIndex === index
                      ? "border-npb-interactive-bg-active ring-2 ring-npb-focus"
                      : "border-npb-border-default hover:border-npb-border-strong",
                  )}
                  aria-label={`Select image ${index + 1}`}
                  aria-pressed={activeImageIndex === index}
                >
                  <img
                    src={image.url}
                    alt=""
                    className="w-14 h-14 object-cover rounded"
                  />
                </button>
              ))}
            </div>
          )}

          {activeImage && activeImageIndex !== null && (
            <div className="border border-npb-border-default rounded p-4 space-y-3 bg-npb-surface-raised">
              <div className="flex justify-between items-center">
                <SettingsLabel>Image {activeImageIndex + 1}</SettingsLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeImage(activeImageIndex)}
                  className="text-red-600"
                  aria-label={`Remove image ${activeImageIndex + 1}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <MediaUrlField
                id={`gallery-image-url-${activeImageIndex}`}
                label="Image URL"
                value={activeImage.url}
                kind="image"
                placeholder="https://example.com/image.jpg"
                onChange={({ url }) => updateImage(activeImageIndex, { url })}
                onLibrarySelect={({ item }) =>
                  updateImage(activeImageIndex, {
                    url: item.url,
                    alt: activeImage.alt || item.alt || item.originalName || item.filename,
                  })
                }
              />

              <div>
                <SettingsLabel htmlFor={`gallery-image-alt-${activeImageIndex}`}>
                  Alt Text
                </SettingsLabel>
                <Input
                  id={`gallery-image-alt-${activeImageIndex}`}
                  value={activeImage.alt || ''}
                  onChange={(e) => updateImage(activeImageIndex, { alt: e.target.value })}
                  placeholder="Image description"
                  className="mt-1 h-9"
                  aria-label={`Alt text for image ${activeImageIndex + 1}`}
                />
              </div>

              <div>
                <SettingsLabel htmlFor={`gallery-image-caption-${activeImageIndex}`}>
                  Caption
                </SettingsLabel>
                <Input
                  id={`gallery-image-caption-${activeImageIndex}`}
                  value={activeImage.caption || ''}
                  onChange={(e) => updateImage(activeImageIndex, { caption: e.target.value })}
                  placeholder="Image caption (optional)"
                  className="mt-1 h-9"
                  aria-label={`Caption for image ${activeImageIndex + 1}`}
                />
              </div>
            </div>
          )}

          <div>
            <SettingsLabel htmlFor="gallery-caption">Gallery caption</SettingsLabel>
            <Input
              id="gallery-caption"
              value={galleryData?.caption || ""}
              onChange={(e) => updateContent({ caption: e.target.value })}
              placeholder="Describe the gallery"
              className="mt-2 h-9"
            />
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Grid layout" icon={Settings} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="gallery-columns">Columns</Label>
            <Select
              value={(galleryData?.columns || 3).toString()}
              onValueChange={(value) => updateContent({ columns: parseInt(value) })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="6">6</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="gallery-crop">Crop images</Label>
            <Switch
              id="gallery-crop"
              checked={galleryData?.imageCrop !== false}
              onCheckedChange={(checked) => updateContent({ imageCrop: checked })}
            />
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Links & image size" icon={Settings} defaultOpen={false}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="gallery-link-to">Link to</Label>
            <Select
              value={galleryData?.linkTo || "none"}
              onValueChange={(value) => updateContent({ linkTo: value as GalleryData['linkTo'] })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="media">Media File</SelectItem>
                <SelectItem value="attachment">Attachment Page</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="gallery-size">Image Size</Label>
            <Select
              value={galleryData?.sizeSlug || "large"}
              onValueChange={(value) => updateContent({ sizeSlug: value })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thumbnail">Thumbnail</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
                <SelectItem value="full">Full</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleCard>


    </div>
  );
}
