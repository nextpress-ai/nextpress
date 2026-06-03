import React, { useState } from "react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import type { BlockDefinition, BlockComponentProps } from "../types.ts";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Square as CoverIcon, Settings } from "lucide-react";
import MediaPickerDialog from "@/components/media/MediaPickerDialog";
import { getBlockStateAccessor } from "../blockStateRegistry";
import { useBlockState } from "../useBlockState";
import { sanitizeHtml } from "../../utils";
import { SettingsLabel } from '../../shared';

// ============================================================================
// TYPES
// ============================================================================

type CoverData = {
  url?: string;
  alt?: string;
  hasParallax?: boolean;
  dimRatio?: number;
  overlayColor?: string;
  minHeight?: number;
  contentPosition?: string;
  customOverlayColor?: string;
  backgroundType?: 'image' | 'video';
  focalPoint?: { x: number; y: number };
  innerContent?: string;
  className?: string;
};

type CoverContent = BlockContent & {
  data?: CoverData;
};

const DEFAULT_DATA: CoverData = {
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
};

const DEFAULT_CONTENT: CoverContent = {
  kind: 'structured',
  data: DEFAULT_DATA,
};

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
// SETTINGS COMPONENT
// ============================================================================

interface CoverSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function CoverSettings({ block, onUpdate }: CoverSettingsProps) {
  const accessor = getBlockStateAccessor(block.id);
  const [, setUpdateTrigger] = React.useState(0);
  const [isPickerOpen, setPickerOpen] = useState(false);

  // Get current state
  const content = accessor
    ? (accessor.getContent() as CoverContent)
    : (block.content as CoverContent) || DEFAULT_CONTENT;

  const blockData = content?.kind === 'structured' 
    ? (content.data as CoverData) 
    : DEFAULT_DATA;

  // Update handlers
  const updateContent = (updates: Partial<CoverData>) => {
    if (accessor) {
      const current = accessor.getContent() as CoverContent;
      const currentData = current?.kind === 'structured' ? (current.data as CoverData) : DEFAULT_DATA;
      accessor.setContent({
        ...current,
        kind: 'structured',
        data: {
          ...currentData,
          ...updates,
        },
      } as CoverContent);
      setUpdateTrigger((prev) => prev + 1);
    } else if (onUpdate) {
      const currentData = block.content?.kind === 'structured' 
        ? (block.content.data as CoverData) 
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

  return (
    <div className="space-y-4">
      <CollapsibleCard title="Content" icon={CoverIcon} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <SettingsLabel htmlFor="cover-content">Cover Content</SettingsLabel>
            <Textarea
              id="cover-content"
              value={blockData?.innerContent || '<p>Write title…</p>'}
              onChange={(e) => updateContent({ innerContent: e.target.value })}
              placeholder="Enter your cover content (HTML allowed)"
              rows={4}
              className="mt-1"
            />
          </div>

          <div>
            <SettingsLabel htmlFor="cover-background-type">Background Type</SettingsLabel>
            <Select
              value={blockData?.backgroundType || 'image'}
              onValueChange={(value) => updateContent({ backgroundType: value as any })}
            >
              <SelectTrigger id="cover-background-type" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <SettingsLabel htmlFor="cover-media">Background {blockData?.backgroundType === 'video' ? 'Video' : 'Image'}</SettingsLabel>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="cover-media"
                value={blockData?.url || ''}
                onChange={(e) => updateContent({ url: e.target.value })}
                placeholder={`https://example.com/${blockData?.backgroundType === 'video' ? 'video.mp4' : 'image.jpg'}`}
                className="h-9"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setPickerOpen(true)}
              >
                Choose
              </Button>
            </div>
            <MediaPickerDialog
              open={isPickerOpen}
              onOpenChange={setPickerOpen}
              kind={blockData?.backgroundType === 'video' ? 'video' : 'image'}
              onSelect={(m) => {
                updateContent({
                  url: m.url,
                  alt: blockData?.alt || m.alt || m.originalName || m.filename,
                });
              }}
            />
          </div>

          {blockData?.backgroundType === 'image' && (
            <div>
              <SettingsLabel htmlFor="cover-alt">Alt Text</SettingsLabel>
              <Input
                id="cover-alt"
                value={blockData?.alt || ''}
                onChange={(e) => updateContent({ alt: e.target.value })}
                placeholder="Background image description"
                className="mt-1 h-9"
              />
            </div>
          )}
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Layout & overlay" icon={Settings} defaultOpen={true}>
        <div className="space-y-4">
          {blockData?.backgroundType === 'image' && (
            <div className="flex items-center justify-between">
              <SettingsLabel htmlFor="cover-parallax">Fixed Background</SettingsLabel>
              <Switch
                id="cover-parallax"
                checked={blockData?.hasParallax || false}
                onCheckedChange={(checked) => updateContent({ hasParallax: checked })}
              />
            </div>
          )}

          <div>
            <SettingsLabel htmlFor="cover-min-height">Minimum Height (px)</SettingsLabel>
            <Input
              id="cover-min-height"
              type="number"
              value={blockData?.minHeight || 400}
              onChange={(e) => updateContent({ minHeight: parseInt(e.target.value) || 400 })}
              className="mt-1 h-9"
            />
          </div>

          <div>
            <SettingsLabel htmlFor="cover-content-position">Content Position</SettingsLabel>
            <Select
              value={blockData?.contentPosition || 'center center'}
              onValueChange={(value) => updateContent({ contentPosition: value })}
            >
              <SelectTrigger id="cover-content-position" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top left">Top Left</SelectItem>
                <SelectItem value="top center">Top Center</SelectItem>
                <SelectItem value="top right">Top Right</SelectItem>
                <SelectItem value="center left">Center Left</SelectItem>
                <SelectItem value="center center">Center Center</SelectItem>
                <SelectItem value="center right">Center Right</SelectItem>
                <SelectItem value="bottom left">Bottom Left</SelectItem>
                <SelectItem value="bottom center">Bottom Center</SelectItem>
                <SelectItem value="bottom right">Bottom Right</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <SettingsLabel htmlFor="cover-overlay-opacity">Overlay Opacity (%)</SettingsLabel>
            <div className="flex items-center space-x-4 mt-1">
              <Slider
                aria-label="Overlay opacity percentage"
                value={[blockData?.dimRatio || 50]}
                onValueChange={([value]) => updateContent({ dimRatio: value })}
                max={100}
                min={0}
                step={5}
                className="flex-1"
              />
              <Input
                id="cover-overlay-opacity"
                type="number"
                value={blockData?.dimRatio || 50}
                onChange={(e) => updateContent({ dimRatio: parseInt(e.target.value) || 50 })}
                className="w-20 h-9"
                min="0"
                max="100"
              />
            </div>
          </div>

          <div>
            <SettingsLabel htmlFor="cover-overlay-color">Overlay Color</SettingsLabel>
            <div className="flex gap-3 mt-1">
              <Input
                id="cover-overlay-color"
                type="color"
                value={blockData?.customOverlayColor || '#000000'}
                onChange={(e) => updateContent({ customOverlayColor: e.target.value })}
                className="w-12 h-9 p-1 border-npb-border-default"
              />
              <Input
                value={blockData?.customOverlayColor || '#000000'}
                onChange={(e) => updateContent({ customOverlayColor: e.target.value })}
                placeholder="#000000"
                className="flex-1 h-9 text-sm"
              />
            </div>
          </div>
        </div>
      </CollapsibleCard>


    </div>
  );
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
