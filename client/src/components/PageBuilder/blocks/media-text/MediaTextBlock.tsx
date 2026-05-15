import React, { useState } from "react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import type { BlockDefinition, BlockComponentProps } from "../types.ts";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import MediaPickerDialog from "@/components/media/MediaPickerDialog";
import { Image as ImageIcon, Settings, Link } from "lucide-react";
import { getBlockStateAccessor } from "../blockStateRegistry";
import { useBlockState } from "../useBlockState";
import { sanitizeHtml } from "../../utils";
import {
  PLACEHOLDER_IMAGE_ALT,
  PLACEHOLDER_IMAGE_URL,
} from "@shared/placeholder-image";

// ============================================================================
// TYPES
// ============================================================================

type MediaTextData = {
  mediaId?: number;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  mediaAlt?: string;
  mediaPosition?: 'left' | 'right';
  mediaWidth?: number;
  isStackedOnMobile?: boolean;
  imageFill?: boolean;
  verticalAlignment?: 'top' | 'center' | 'bottom';
  href?: string;
  linkTarget?: '_self' | '_blank';
  rel?: string;
  title?: string;
  content?: string;
  className?: string;
  anchor?: string;
};

type MediaTextContent = BlockContent & {
  data?: MediaTextData;
};

const DEFAULT_DATA: MediaTextData = {
  mediaId: undefined,
  mediaUrl: PLACEHOLDER_IMAGE_URL,
  mediaType: 'image',
  mediaAlt: PLACEHOLDER_IMAGE_ALT,
  mediaPosition: 'left',
  mediaWidth: 50,
  isStackedOnMobile: false,
  imageFill: false,
  verticalAlignment: 'center',
  href: '',
  linkTarget: '_self',
  rel: '',
  title: '',
  content: '<p>Add your content…</p>',
  anchor: '',
  className: '',
};

const DEFAULT_CONTENT: MediaTextContent = {
  kind: 'structured',
  data: DEFAULT_DATA,
};

// ============================================================================
// RENDERER
// ============================================================================

interface MediaTextRendererProps {
  content: MediaTextContent;
  styles?: React.CSSProperties;
}

function MediaTextRenderer({ content, styles }: MediaTextRendererProps) {
  const blockData = content?.kind === 'structured' 
    ? (content.data as MediaTextData) 
    : DEFAULT_DATA;
    
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

  const wrapperClasses = [
    'wp-block-media-text',
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
    mediaUrl ? <img src={mediaUrl} alt={mediaAlt || ''} /> : null
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
    <div id={anchor} className={wrapperClasses} style={{ ...styles, display: 'flex', gap: '20px', alignItems }}>
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
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MediaTextBlockComponent({
  value,
  onChange,
}: BlockComponentProps) {
  const { content, styles } = useBlockState<MediaTextContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
  });

  return <MediaTextRenderer content={content} styles={styles} />;
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface MediaTextSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function MediaTextSettings({ block, onUpdate }: MediaTextSettingsProps) {
  const accessor = getBlockStateAccessor(block.id);
  const [, setUpdateTrigger] = React.useState(0);
  const [isPickerOpen, setPickerOpen] = useState(false);

  // Get current state
  const content = accessor
    ? (accessor.getContent() as MediaTextContent)
    : (block.content as MediaTextContent) || DEFAULT_CONTENT;
  const blockData = content?.kind === 'structured' 
    ? (content.data as MediaTextData) 
    : DEFAULT_DATA;

  // Update handlers
  const updateContent = (updates: Partial<MediaTextData>) => {
    if (accessor) {
      const current = accessor.getContent() as MediaTextContent;
      const currentData = current?.kind === 'structured' ? (current.data as MediaTextData) : DEFAULT_DATA;
      accessor.setContent({
        ...current,
        kind: 'structured',
        data: {
          ...currentData,
          ...updates,
        },
      } as MediaTextContent);
      setUpdateTrigger((prev) => prev + 1);
    } else if (onUpdate) {
      const currentData = block.content?.kind === 'structured' 
        ? (block.content.data as MediaTextData) 
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
      <CollapsibleCard title="Content" icon={ImageIcon} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="media-url" className="text-sm font-medium text-gray-700">Media URL</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="media-url"
                value={blockData?.mediaUrl || ''}
                onChange={(e) => updateContent({ mediaUrl: e.target.value })}
                placeholder="https://example.com/image-or-video.jpg"
                className="h-9"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>Choose</Button>
            </div>
            <MediaPickerDialog
              open={isPickerOpen}
              onOpenChange={setPickerOpen}
              kind="any"
              onSelect={(m) => {
                const type = m.mimeType?.startsWith("video/") ? "video" : "image";
                updateContent({
                  mediaId: m.id,
                  mediaUrl: m.url,
                  mediaType: type,
                  mediaAlt: blockData?.mediaAlt || m.alt || m.originalName || m.filename,
                });
              }}
            />
          </div>
          <div>
            <Label htmlFor="media-alt" className="text-sm font-medium text-gray-700">Alt Text</Label>
            <Input
              id="media-alt"
              value={blockData?.mediaAlt || ''}
              onChange={(e) => updateContent({ mediaAlt: e.target.value })}
              placeholder="Describe the media"
              className="mt-1 h-9"
            />
          </div>
          <div>
            <Label htmlFor="text-content" className="text-sm font-medium text-gray-700">Text Content (HTML)</Label>
            <Textarea
              id="text-content"
              value={blockData?.content || ''}
              onChange={(e) => updateContent({ content: e.target.value })}
              placeholder="<p>Add your content…</p>"
              rows={4}
              className="mt-1"
            />
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Layout" icon={Settings} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="media-position" className="text-sm font-medium text-gray-700">Media Position</Label>
            <Select
              value={blockData?.mediaPosition || 'left'}
              onValueChange={(value) => updateContent({ mediaPosition: value as any })}
            >
              <SelectTrigger id="media-position" className="h-9 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="media-width" className="text-sm font-medium text-gray-700">Media Width (%)</Label>
            <Input
              id="media-width"
              type="number"
              min={0}
              max={100}
              value={blockData?.mediaWidth ?? 50}
              onChange={(e) => updateContent({ mediaWidth: Number(e.target.value) })}
              className="h-9 mt-1"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="stacked-mobile" className="text-sm font-medium text-gray-700">Stack on mobile</Label>
            <Switch
              id="stacked-mobile"
              checked={Boolean(blockData?.isStackedOnMobile)}
              onCheckedChange={(checked) => updateContent({ isStackedOnMobile: checked })}
              />
            </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="image-fill" className="text-sm font-medium text-gray-700">Image fill</Label>
            <Switch
              id="image-fill"
              checked={Boolean(blockData?.imageFill)}
              onCheckedChange={(checked) => updateContent({ imageFill: checked })}
            />
          </div>
          
          <div>
            <Label htmlFor="vertical-align" className="text-sm font-medium text-gray-700">Vertical alignment</Label>
            <Select
              value={blockData?.verticalAlignment || 'center'}
              onValueChange={(value) => updateContent({ verticalAlignment: value as any })}
            >
              <SelectTrigger id="vertical-align" className="h-9 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Link Settings" icon={Link} defaultOpen={false}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="media-link" className="text-sm font-medium text-gray-700">Media Link</Label>
            <Input
              id="media-link"
              value={blockData?.href || ''}
              onChange={(e) => updateContent({ href: e.target.value })}
              placeholder="https://example.com"
              className="mt-1 h-9"
            />
          </div>
          
          <div>
            <Label htmlFor="media-target" className="text-sm font-medium text-gray-700">Link Target</Label>
            <Select
              value={blockData?.linkTarget || '_self'}
              onValueChange={(value) => updateContent({ linkTarget: value as any })}
            >
              <SelectTrigger id="media-target" className="h-9 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_self">Same Window</SelectItem>
                <SelectItem value="_blank">New Window</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="media-rel" className="text-sm font-medium text-gray-700">Rel</Label>
            <Input
              id="media-rel"
              value={blockData?.rel || ''}
              onChange={(e) => updateContent({ rel: e.target.value })}
              placeholder="noopener noreferrer"
              className="h-9 mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="media-title" className="text-sm font-medium text-gray-700">Title</Label>
            <Input
              id="media-title"
              value={blockData?.title || ''}
              onChange={(e) => updateContent({ title: e.target.value })}
              placeholder="Media title"
              className="mt-1 h-9"
            />
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

const MediaTextBlock: BlockDefinition = {
  id: 'core/media-text',
  label: 'Media & Text',
  icon: ImageIcon,
  description: 'Display media and text side by side',
  category: 'media',
  defaultContent: {
    kind: 'structured',
    data: {
      mediaId: undefined,
      mediaUrl: PLACEHOLDER_IMAGE_URL,
      mediaType: 'image',
      mediaAlt: PLACEHOLDER_IMAGE_ALT,
      mediaPosition: 'left',
      mediaWidth: 50,
      isStackedOnMobile: false,
      imageFill: false,
      verticalAlignment: 'center',
      href: '',
      linkTarget: '_self',
      rel: '',
      title: '',
      content: '<p>Add your content…</p>',
      anchor: '',
      className: '',
    },
  },
  defaultStyles: { margin: '1em 0' },
  component: MediaTextBlockComponent,
  settings: MediaTextSettings,
  hasSettings: true,
};

export default MediaTextBlock;
