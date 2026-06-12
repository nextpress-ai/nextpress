import React from "react";
import { Image as ImageIcon } from "lucide-react";
import { createBlockDefinition } from "../createBlockDefinition";
import { BlockShell } from "../shared/block-shell";
import {
  type GalleryContent,
  type GalleryData,
  type GalleryImage,
  DEFAULT_DATA,
  DEFAULT_CONTENT,
} from "./gallery-model";
import { GallerySettings } from "./gallery-settings";

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

  const extraClassName = [
    `has-nested-images`,
    `columns-${columns}`,
    imageCrop ? 'is-cropped' : '',
    galleryData?.className || "",
  ].filter(Boolean).join(" ");

  if (images.length === 0) {
    return (
      <BlockShell blockClass="wp-block-gallery" className={extraClassName || undefined} style={styles}>
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
      className={extraClassName || undefined}
      style={styles}
    >
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
                <div className="blocks-gallery-item__caption text-sm text-npb-text-muted mt-1">
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
    </BlockShell>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const GalleryBlock = createBlockDefinition<GalleryContent>({
  id: 'core/gallery',
  label: 'Gallery',
  icon: ImageIcon,
  description: 'Display multiple images in a rich gallery',
  category: 'media',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: { width: '100%', margin: '1em 0' },
  settings: GallerySettings,
  hasSettings: true,
  render: ({ content, styles }) => <GalleryRenderer content={content} styles={styles} />,
});

export default GalleryBlock;
