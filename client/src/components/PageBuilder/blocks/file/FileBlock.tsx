import React from "react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { File as FileIcon, Download, Settings } from "lucide-react";
import { createBlockDefinition } from "../createBlockDefinition";
import { BlockShell } from "../shared/block-shell";
import { useSettingsState } from "../useSettingsState";
import { SettingsLabel } from '../../shared';
import { MediaUrlField } from "../shared/media-url-field";
import { LinkTargetSelect } from "../shared/link-settings";

// ============================================================================
// TYPES
// ============================================================================

type FileData = {
  href?: string;
  fileName?: string;
  textLinkHref?: string;
  textLinkTarget?: '_self' | '_blank';
  showDownloadButton?: boolean;
  downloadButtonText?: string;
  displayPreview?: boolean;
  fileSize?: string;
  className?: string;
};

type FileContent = BlockContent & {
  data?: FileData;
};

const DEFAULT_DATA: FileData = {
  href: '',
  fileName: '',
  textLinkHref: '',
  textLinkTarget: '_self',
  showDownloadButton: true,
  downloadButtonText: 'Download',
  displayPreview: true,
  fileSize: '',
  className: '',
};

const DEFAULT_CONTENT: FileContent = {
  kind: 'structured',
  data: DEFAULT_DATA,
};

// ============================================================================
// UTILITIES
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================================================
// RENDERER
// ============================================================================

interface FileRendererProps {
  content: FileContent;
  styles?: React.CSSProperties;
}

function FileRenderer({ content, styles }: FileRendererProps) {
  const blockData = content?.kind === 'structured' 
    ? (content.data as FileData) 
    : DEFAULT_DATA;
    
  const url = blockData?.href || '';
  const fileName = blockData?.fileName || '';
  const textLinkHref = blockData?.textLinkHref || url;
  const textLinkTarget = blockData?.textLinkTarget || '_self';
  const showDownloadButton = blockData?.showDownloadButton !== false;
  const downloadButtonText = blockData?.downloadButtonText || 'Download';
  const displayPreview = blockData?.displayPreview !== false;
  
  if (!url) {
    return (
      <BlockShell blockClass="wp-block-file" className={blockData?.className} style={styles}>
        <div className="file-placeholder text-center text-npb-text-muted p-8 border-2 border-dashed border-npb-border-default rounded">
          <FileIcon className="w-12 h-12 mx-auto mb-2" />
          <p>File Block</p>
          <small>Add a file for users to download</small>
        </div>
      </BlockShell>
    );
  }

  const fileExtension = fileName ? fileName.split('.').pop()?.toUpperCase() : '';
  const fileSize = blockData?.fileSize || '';

  return (
    <BlockShell blockClass="wp-block-file" className={blockData?.className} style={styles}>
      <div className="wp-block-file__content-wrapper">
        {displayPreview && (
          <div className="wp-block-file__preview">
            <div className="file-info" style={{ display: 'flex', alignItems: 'center', marginBottom: '1em' }}>
              <FileIcon className="w-8 h-8 mr-3 text-npb-text-secondary" />
              <div>
                <div className="file-name font-medium">
                  <a 
                    href={textLinkHref} 
                    target={textLinkTarget}
                    style={{ textDecoration: 'none', color: '#007cba' }}
                  >
                    {fileName || 'Download File'}
                  </a>
                </div>
                {(fileExtension || fileSize) && (
                  <div className="file-details text-sm text-npb-text-muted">
                    {fileExtension && <span>{fileExtension}</span>}
                    {fileExtension && fileSize && <span> • </span>}
                    {fileSize && <span>{fileSize}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {showDownloadButton && (
          <div className="wp-block-file__button-container">
            <a
              href={url}
              className="wp-block-file__button"
              download={fileName}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: '#007cba',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '4px',
                textDecoration: 'none',
                fontSize: '16px',
                fontWeight: '600',
                gap: '8px',
              }}
            >
              <Download className="w-4 h-4" />
              {downloadButtonText}
            </a>
          </div>
        )}
      </div>
    </BlockShell>
  );
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface FileSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function FileSettings({ block, onUpdate }: FileSettingsProps) {
  const { accessor, rerender } = useSettingsState({ block, onUpdate });

  // Get current state
  const content = accessor
    ? (accessor.getContent() as FileContent)
    : (block.content as FileContent) || DEFAULT_CONTENT;

  const blockData = content?.kind === 'structured' 
    ? (content.data as FileData) 
    : DEFAULT_DATA;

  // Update handlers
  const updateContent = (updates: Partial<FileData>) => {
    if (accessor) {
      const current = accessor.getContent() as FileContent;
      const currentData = current?.kind === 'structured' ? (current.data as FileData) : DEFAULT_DATA;
      accessor.setContent({
        ...current,
        kind: 'structured',
        data: {
          ...currentData,
          ...updates,
        },
      } as FileContent);
      rerender();
    } else if (onUpdate) {
      const currentData = block.content?.kind === 'structured' 
        ? (block.content.data as FileData) 
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
      {/* Content Card */}
      <CollapsibleCard title="Content" icon={FileIcon} defaultOpen={true}>
        <div className="space-y-4">
          <MediaUrlField
            id="file-url"
            label="File URL"
            value={blockData?.href || ""}
            kind="any"
            libraryButtonLabel="Choose"
            placeholder="https://example.com/document.pdf"
            onChange={({ url }) => updateContent({ href: url, textLinkHref: url })}
            onLibrarySelect={({ item }) => {
              updateContent({
                href: item.url,
                textLinkHref: item.url,
                fileName: item.originalName || item.filename,
                fileSize: item.size ? formatFileSize(item.size) : "",
              });
            }}
          />

          <div>
            <SettingsLabel htmlFor="file-name">File Name</SettingsLabel>
            <Input
              id="file-name"
              value={blockData?.fileName || ''}
              onChange={(e) => updateContent({ fileName: e.target.value })}
              placeholder="document.pdf"
              className="mt-1 h-9"
            />
          </div>

          <div>
            <SettingsLabel htmlFor="file-size">File Size (optional)</SettingsLabel>
            <Input
              id="file-size"
              value={blockData?.fileSize || ''}
              onChange={(e) => updateContent({ fileSize: e.target.value })}
              placeholder="2.5 MB"
              className="mt-1 h-9"
            />
          </div>
        </div>
      </CollapsibleCard>

      {/* Settings Card */}
      <CollapsibleCard title="Settings" icon={Settings} defaultOpen={true}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="file-show-preview">Show file preview</SettingsLabel>
            <Switch
              id="file-show-preview"
              checked={blockData?.displayPreview !== false}
              onCheckedChange={(checked) => updateContent({ displayPreview: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <SettingsLabel htmlFor="file-show-download">Show download button</SettingsLabel>
            <Switch
              id="file-show-download"
              checked={blockData?.showDownloadButton !== false}
              onCheckedChange={(checked) => updateContent({ showDownloadButton: checked })}
            />
          </div>

          {blockData?.showDownloadButton !== false && (
            <div>
              <SettingsLabel htmlFor="file-button-text">Download Button Text</SettingsLabel>
              <Input
                id="file-button-text"
                value={blockData?.downloadButtonText || 'Download'}
                onChange={(e) => updateContent({ downloadButtonText: e.target.value })}
                placeholder="Download"
                className="mt-1 h-9"
              />
            </div>
          )}

          <LinkTargetSelect
            id="file-link-target"
            label="Link Target"
            value={blockData?.textLinkTarget}
            onChange={({ target }) => updateContent({ textLinkTarget: target })}
          />
        </div>
      </CollapsibleCard>


    </div>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const FileBlock = createBlockDefinition<FileContent>({
  id: 'core/file',
  label: 'File',
  icon: FileIcon,
  description: 'Add a link to a downloadable file',
  category: 'media',
  defaultContent: DEFAULT_CONTENT,
  defaultStyles: {
    margin: '1em 0',
  },
  settings: FileSettings,
  hasSettings: true,
  render: ({ content, styles }) => <FileRenderer content={content} styles={styles} />,
});

export default FileBlock;
