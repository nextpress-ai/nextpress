import React from "react";
import type { BlockDefinition, BlockComponentProps } from "../types.ts";
import { Image as ImageIcon } from "lucide-react";
import { useBlockState } from "../useBlockState";
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
        <div className="gallery-placeholder text-center text-npb-text-muted p-8 border-2 border-dashed border-npb-border-default rounded">
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
