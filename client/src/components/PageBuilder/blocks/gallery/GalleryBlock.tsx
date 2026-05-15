import React, { useState } from "react";
import type { BlockConfig, BlockContent, Media } from "@shared/schema-types";
import type { BlockDefinition, BlockComponentProps } from "../types.ts";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Image as ImageIcon } from "lucide-react";
import MediaPickerDialog from "@/components/media/MediaPickerDialog";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Settings } from "lucide-react";
import { getBlockStateAccessor } from "../blockStateRegistry";
import { useBlockState } from "../useBlockState";

// ============================================================================
// TYPES
// ============================================================================

interface GalleryImage {
  id: string | number;
  url: string;
  alt: string;
  caption?: string;
  sizeSlug?: string;
}

type GalleryData = {
  images?: GalleryImage[];
  columns?: number;
  imageCrop?: boolean;
  linkTo?: 'none' | 'media' | 'attachment';
  sizeSlug?: string;
  caption?: string;
  className?: string;
};

type GalleryContent = BlockContent & {
  data?: GalleryData;
};

const DEFAULT_DATA: GalleryData = {
  images: [],
  columns: 3,
  imageCrop: true,
  linkTo: 'none',
  sizeSlug: 'large',
  caption: '',
  className: '',
};

const DEFAULT_CONTENT: GalleryContent = {
  kind: 'structured',
  data: DEFAULT_DATA,
};

// ============================================================================
// RENDERER
// ============================================================================

interface GalleryRendererProps {
  content: GalleryContent;
  styles?: React.CSSProperties;
}

function GalleryRenderer({ content, styles }: GalleryRendererProps) {
  const galleryData = content?.kind === 'structured' ? (content.data as GalleryData) : DEFAULT_DATA;
  
  const images: GalleryImage[] = Array.isArray(galleryData?.images)
    ? galleryData.images
    : [];

  const columns = galleryData?.columns || 3;
  const imageCrop = galleryData?.imageCrop !== false;
  const linkTo = galleryData?.linkTo || 'none';
  const sizeSlug = galleryData?.sizeSlug || 'large';
  const caption = galleryData?.caption || '';

  const className = [
    "wp-block-gallery",
    `has-nested-images`,
    `columns-${columns}`,
    imageCrop ? 'is-cropped' : '',
    galleryData?.className || "",
  ].filter(Boolean).join(" ");

  if (images.length === 0) {
    return (
      <div className={className} style={styles}>
        <div className="gallery-placeholder text-center text-gray-400 p-8 border-2 border-dashed border-gray-300 rounded">
          <ImageIcon className="w-12 h-12 mx-auto mb-2" />
          <p>Gallery</p>
          <small>Add images to create a gallery</small>
        </div>
      </div>
    );
  }

  return (
    <figure className={className} style={styles}>
      <div
        className="blocks-gallery-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: '16px',
        }}
      >
        {images.map((image, index) => {
          const imgElement = (
            <img
              key={image.id || index}
              src={image.url}
              alt={image.alt}
              style={{
                width: '100%',
                height: imageCrop ? '200px' : 'auto',
                objectFit: imageCrop ? 'cover' : 'contain',
                borderRadius: '4px',
              }}
            />
          );

          const linkContent = linkTo === 'media' ? (
            <a href={image.url} target="_blank" rel="noopener noreferrer">
              {imgElement}
            </a>
          ) : imgElement;

          return (
            <div key={image.id || index} className="wp-block-image">
              {linkContent}
              {image.caption && (
                <div className="blocks-gallery-item__caption text-sm text-gray-500 mt-1">
                  {image.caption}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {caption && (
        <figcaption className="blocks-gallery-caption">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GalleryBlockComponent({
  value,
  onChange,
}: BlockComponentProps) {
  const { content, styles } = useBlockState<GalleryContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
  });

  return <GalleryRenderer content={content} styles={styles} />;
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface GallerySettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function GallerySettings({ block, onUpdate }: GallerySettingsProps) {
  const accessor = getBlockStateAccessor(block.id);
  const [, setUpdateTrigger] = React.useState(0);
  const [isPickerOpen, setPickerOpen] = useState(false);

  // Get current state
  const content = accessor
    ? (accessor.getContent() as GalleryContent)
    : (block.content as GalleryContent) || DEFAULT_CONTENT;
  const galleryData = content?.kind === 'structured' ? (content.data as GalleryData) : DEFAULT_DATA;
  
  const images: GalleryImage[] = Array.isArray(galleryData?.images)
    ? galleryData.images
    : [];

  // Update handlers
  const updateContent = (updates: Partial<GalleryData>) => {
    if (accessor) {
      const current = accessor.getContent() as GalleryContent;
      const currentData = current?.kind === 'structured' ? (current.data as GalleryData) : DEFAULT_DATA;
      accessor.setContent({
        ...current,
        kind: 'structured',
        data: {
          ...currentData,
          ...updates,
        },
      } as GalleryContent);
      setUpdateTrigger((prev) => prev + 1);
    } else if (onUpdate) {
      const currentData = block.content?.kind === 'structured' 
        ? (block.content.data as GalleryData) 
        : DEFAULT_DATA;
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
    updateContent({ images: newImages });
  };

  const addImage = (selectedImage: Media) => {
    const newImage = {
      id: selectedImage.id,
      url: selectedImage.url,
      alt: selectedImage.alt || selectedImage.originalName || selectedImage.filename,
      caption: '',
      sizeSlug: 'large',
    };
    updateImages([...images, newImage]);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    updateImages(newImages);
  };

  const updateImage = (index: number, updates: Partial<GalleryImage>) => {
    const newImages = images.map((img, i) => i === index ? { ...img, ...updates } : img);
    updateImages(newImages);
  };

  return (
    <div className="space-y-4">
      <CollapsibleCard title="Content" icon={ImageIcon} defaultOpen={true}>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>Gallery Images ({images.length})</Label>
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

          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto" aria-label="Gallery image grid">
            {images.map((image, index) => (
              <div key={image.id || index} className="relative border rounded p-2">
                <img
                  src={image.url}
                  alt={image.alt}
                  className="w-full h-20 object-cover rounded mb-2"
                />
                <Input
                  value={image.caption || ''}
                  onChange={(e) => updateImage(index, { caption: e.target.value })}
                  placeholder="Caption (optional)"
                  className="text-xs mb-1 h-9"
                  aria-label={`Caption for image ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 text-red-600 p-1 h-auto"
                  aria-label={`Remove image ${index + 1}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>

          <div>
            <Label htmlFor="gallery-caption">Gallery caption</Label>
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
              onValueChange={(value) => updateContent({ linkTo: value as any })}
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

// ============================================================================
// LEGACY RENDERER (Backward Compatibility)
// ============================================================================

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const GalleryBlock: BlockDefinition = {
  id: 'core/gallery',
  label: 'Gallery',
  icon: ImageIcon,
  description: 'Display multiple images in a rich gallery',
  category: 'media',
  defaultContent: {
    kind: 'structured',
    data: {
      images: [],
      columns: 3,
      imageCrop: true,
      linkTo: 'none',
      sizeSlug: 'large',
      caption: '',
      className: '',
    },
  },
  defaultStyles: { width: '100%', margin: '1em 0' },
  component: GalleryBlockComponent,
  settings: GallerySettings,
  hasSettings: true,
};

export default GalleryBlock;
