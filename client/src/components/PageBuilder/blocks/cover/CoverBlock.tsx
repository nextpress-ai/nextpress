import React from "react";
import type { BlockDefinition, BlockComponentProps } from "../types.ts";
import { Square as CoverIcon } from "lucide-react";
import { useBlockState } from "../useBlockState";
import { sanitizeHtml } from "../../utils";
import { type CoverContent, type CoverData, DEFAULT_CONTENT, DEFAULT_DATA } from './cover-model';
import { CoverSettings } from './cover-settings';

// ============================================================================
// RENDERER
// ============================================================================

interface CoverRendererProps {
  content: CoverContent;
  styles?: React.CSSProperties;
}

function CoverRenderer({ content, styles }: CoverRendererProps) {
  const blockData = content?.kind === 'structured'
    ? (content.data as CoverData)
    : DEFAULT_DATA;

  const url = blockData?.url || '';
  const alt = blockData?.alt || '';
  const hasParallax = blockData?.hasParallax || false;
  const dimRatio = blockData?.dimRatio || 50;
  const overlayColor = blockData?.overlayColor || 'rgba(0,0,0,0.5)';
  const minHeight = blockData?.minHeight || 400;
  const contentPosition = blockData?.contentPosition || 'center center';
  const customOverlayColor = blockData?.customOverlayColor || '';
  const backgroundType = blockData?.backgroundType || 'image';
  const focalPoint = blockData?.focalPoint || { x: 0.5, y: 0.5 };
  const innerContent = blockData?.innerContent || '<p>Write title…</p>';

  const className = [
    "wp-block-cover",
    hasParallax ? 'has-parallax' : '',
    backgroundType === 'video' ? 'has-background-video' : '',
    blockData?.className || "",
  ].filter(Boolean).join(" ");

  const overlayStyle = {
    backgroundColor: customOverlayColor || overlayColor,
    opacity: dimRatio / 100,
  };

  const backgroundImageStyle = url && backgroundType === 'image' ? {
    backgroundImage: `url(${url})`,
    backgroundPosition: `${focalPoint.x * 100}% ${focalPoint.y * 100}%`,
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: hasParallax ? 'fixed' : 'scroll',
  } : {};

  const contentAlignment = (() => {
    const [vertical, horizontal] = contentPosition.split(' ');
    return {
      display: 'flex',
      alignItems: vertical === 'top' ? 'flex-start' : vertical === 'bottom' ? 'flex-end' : 'center',
      justifyContent: horizontal === 'left' ? 'flex-start' : horizontal === 'right' ? 'flex-end' : 'center',
    };
  })();

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        minHeight: `${minHeight}px`,
        overflow: 'hidden',
        ...backgroundImageStyle,
        ...styles,
      }}
    >
      {backgroundType === 'video' && url && (
        <video
          autoPlay
          muted
          loop
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 1,
          }}
        >
          <source src={url} type="video/mp4" />
        </video>
      )}

      <div
        className="wp-block-cover__background"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 2,
          ...overlayStyle,
        }}
      />

      <div
        className="wp-block-cover__inner-container"
        style={{
          position: 'relative',
          zIndex: 3,
          width: '100%',
          height: '100%',
          padding: '1.25em 2.375em',
          color: 'white',
          ...contentAlignment,
        }}
      >
        <div
          className="cover-content"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(innerContent) }}
          style={{
            textAlign: contentPosition.includes('center') ? 'center' :
                      contentPosition.includes('right') ? 'right' : 'left',
          }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CoverBlockComponent({
  value,
  onChange,
}: BlockComponentProps) {
  const { content, styles } = useBlockState<CoverContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
  });

  return <CoverRenderer content={content} styles={styles} />;
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const CoverBlock: BlockDefinition = {
  id: 'core/cover',
  label: 'Cover',
  icon: CoverIcon,
  description: 'Add an image or video with a text overlay',
  category: 'media',
  defaultContent: {
    kind: 'structured',
    data: {
      url: '',
      alt: '',
      hasParallax: false,
      dimRatio: 50,
      minHeight: 400,
      contentPosition: 'center center',
      customOverlayColor: '#000000',
      backgroundType: 'image',
      focalPoint: { x: 0.5, y: 0.5 },
      innerContent: '<p style="font-size: 2.5em; font-weight: bold;">Write title…</p>',
      className: '',
    },
  },
  defaultStyles: {},
  component: CoverBlockComponent,
  settings: CoverSettings,
  hasSettings: true,
};

export default CoverBlock;
