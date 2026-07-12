import React from "react";
import { Image as ImageIcon } from "lucide-react";
import { createBlockDefinition } from "../createBlockDefinition";
import { BlockShell } from "../shared/block-shell";
import { readGalleryData, DEFAULT_DATA } from "@shared/gallery-model";
import { buildGalleryRenderModel } from "@shared/gallery-render";
import { GallerySettings } from "./gallery-settings";

// ============================================================================
// RENDERER
// ============================================================================

interface GalleryRendererProps {
  galleryData: import("@shared/gallery-model").GalleryData;
  styles?: React.CSSProperties;
}

function GalleryRenderer({ galleryData, styles }: GalleryRendererProps) {
  const model = buildGalleryRenderModel({
    content: galleryData,
    styles: styles as Record<string, string | undefined>,
  });

  if (model.images.length === 0) {
    return (
      <BlockShell blockClass="wp-block-gallery" className={model.modifierClassName || undefined} style={styles}>
        <div className="gallery-placeholder text-center text-npb-text-muted p-8 border-2 border-dashed border-npb-border-default rounded">
          <ImageIcon className="w-12 h-12 mx-auto mb-2" />
          <p>Gallery</p>
          <small>Add images to create a gallery</small>
        </div>
      </BlockShell>
    );
  }

  return (
    <BlockShell
      as="figure"
      blockClass="wp-block-gallery"
      className={model.modifierClassName || undefined}
      style={styles}
    >
      <div className="blocks-gallery-grid" style={model.gridStyle}>
        {model.images.map((image, index) => {
          const imgElement = (
            <img
              key={image.id || index}
              src={image.url}
              alt={image.alt}
              style={model.imageStyle}
            />
          );

          const linkContent = model.linkTo === "media" ? (
            <a href={image.url} target="_blank" rel="noopener noreferrer">
              {imgElement}
            </a>
          ) : imgElement;

          return (
            <div key={image.id || index} className="wp-block-image">
              {linkContent}
              {image.caption && (
                <div className="blocks-gallery-item__caption text-sm text-npb-text-muted mt-1">
                  {image.caption}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {model.caption && (
        <figcaption className="blocks-gallery-caption">{model.caption}</figcaption>
      )}
    </BlockShell>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const GalleryBlock = createBlockDefinition<import("@shared/gallery-model").GalleryData>({
  id: 'core/gallery',
  label: 'Gallery',
  icon: ImageIcon,
  description: 'Display multiple images in a rich gallery',
  category: 'media',
  defaultContent: DEFAULT_DATA,
  defaultStyles: { width: '100%', margin: '1em 0' },
  settings: GallerySettings,
  hasSettings: true,
  render: ({ content, styles }) => (
    <GalleryRenderer galleryData={content ?? DEFAULT_DATA} styles={styles} />
  ),
});

export default GalleryBlock;
