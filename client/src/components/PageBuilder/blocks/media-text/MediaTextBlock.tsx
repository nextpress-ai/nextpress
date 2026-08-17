import React from "react";
import { Image as ImageIcon } from "lucide-react";
import { readStructuredBlockData } from "@shared/read-block-content";
import { sanitizeHtml } from "../../utils";
import { createBlockDefinition } from "../createBlockDefinition";
import { BlockShell } from "../shared/block-shell";
import { type MediaTextContent, type MediaTextData, DEFAULT_CONTENT, DEFAULT_DATA } from './media-text-model';
import { MediaTextSettings } from './media-text-settings';

// ============================================================================
// RENDERER
// ============================================================================

interface MediaTextRendererProps {
  content: MediaTextContent;
  styles?: React.CSSProperties;
}

function MediaTextRenderer({ content, styles }: MediaTextRendererProps) {
  const blockData = readStructuredBlockData(content, DEFAULT_DATA);

  const {
    mediaUrl,
    mediaAlt,
    mediaPosition = 'left',
    mediaWidth = 50,
    isStackedOnMobile = false,
    imageFill = false,
    verticalAlignment = 'center',
    href,
    linkTarget,
    rel,
    title,
    content: textContent,
    className,
    anchor,
  } = blockData;

  const extraClassName = [
    mediaPosition === 'right' ? 'has-media-on-the-right' : '',
    isStackedOnMobile ? 'is-stacked-on-mobile' : '',
    imageFill ? 'is-image-fill' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  const alignItems = verticalAlignment === 'top' ? 'flex-start' : verticalAlignment === 'bottom' ? 'flex-end' : 'center';

  const mediaStyle: React.CSSProperties = imageFill
    ? { backgroundImage: mediaUrl ? `url(${mediaUrl})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  const mediaInner = imageFill ? null : (
    mediaUrl ? <img src={mediaUrl} alt={mediaAlt || ''} style={{ maxWidth: '100%', height: 'auto' }} /> : null
  );

  const mediaContent = href ? (
    <a href={href} target={linkTarget} rel={rel} title={title} className="wp-block-media-text__media" style={{ ...mediaStyle, flexBasis: `${mediaWidth}%` }}>
      {mediaInner}
    </a>
  ) : (
    <div className="wp-block-media-text__media" style={{ ...mediaStyle, flexBasis: `${mediaWidth}%` }}>
      {mediaInner}
    </div>
  );

  return (
    <BlockShell
      blockClass="wp-block-media-text"
      className={extraClassName || undefined}
      id={anchor}
      style={{ ...styles, display: 'flex', gap: '20px', alignItems }}
    >
      {mediaPosition === 'left' ? (
        <>
          {mediaContent}
          <div className="wp-block-media-text__content" style={{ flexBasis: `${100 - (mediaWidth || 50)}%` }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(textContent || '<p>Add text…</p>') }} />
        </>
      ) : (
        <>
          <div className="wp-block-media-text__content" style={{ flexBasis: `${100 - (mediaWidth || 50)}%` }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(textContent || '<p>Add text…</p>') }} />
          {mediaContent}
        </>
      )}
    </BlockShell>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const MediaTextBlock = createBlockDefinition<MediaTextContent>({
  id: 'core/media-text',
  label: 'Media & Text',
  icon: ImageIcon,
  description: 'Display media and text side by side',
  category: 'media',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: { margin: '1em 0' },
  settings: MediaTextSettings,
  hasSettings: true,
  render: ({ content, styles }) => <MediaTextRenderer content={content} styles={styles} />,
});

export default MediaTextBlock;
