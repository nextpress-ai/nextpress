import React from "react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import type { BlockDefinition, BlockComponentProps } from "../types.ts";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { MousePointer, ExternalLink, Type, Link, Smile, X } from "lucide-react";
import { getBlockStateAccessor } from "../blockStateRegistry";
import { useBlockState } from "../useBlockState";
import { IconRenderer } from "../shared/IconRenderer";
import { IconPickerButton } from "../../IconPicker/IconPickerButton";
import { formatIconReferenceLabel, type IconReference } from "@/lib/icon-indexes";
import {
  NPB_ICON_REFERENCE_ROW_MAX_CHARS,
  truncateWithEllipsis,
} from "@/lib/truncate-with-ellipsis";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================================================
// TYPES
// ============================================================================

type ButtonContent = BlockContent & {
  url?: string;
  linkTarget?: '_self' | '_blank';
  target?: string;
  rel?: string;
  title?: string;
  className?: string;
  // Icon support
  icon?: IconReference;
  iconPosition?: 'left' | 'right';
  iconOnly?: boolean;
};

const DEFAULT_CONTENT: ButtonContent = {
  kind: 'text',
  value: 'Click Me',
  url: '#',
  linkTarget: '_self',
  rel: '',
  title: '',
  className: '',
};

// ============================================================================
// RENDERER
// ============================================================================

interface ButtonRendererProps {
  content: ButtonContent;
  styles?: React.CSSProperties;
  isPreview?: boolean;
}

function mapTextAlignToJustifyContent(
  textAlign: React.CSSProperties["textAlign"] | undefined,
): React.CSSProperties["justifyContent"] | undefined {
  if (!textAlign) return undefined;
  if (textAlign === "left") return "flex-start";
  if (textAlign === "center") return "center";
  if (textAlign === "right") return "flex-end";
  return undefined;
}

function ButtonRenderer({ content, styles, isPreview }: ButtonRendererProps) {
  const textContent = content?.kind === 'text' ? content.value : '';
  const url = content?.url as string | undefined;
  const linkTarget = (content?.linkTarget as string | undefined) || (content?.target as string | undefined);
  const rel = content?.rel as string | undefined;
  const title = content?.title as string | undefined;
  const extraClass = (content?.className as string | undefined) || "";

  // Icon props
  const icon = content?.icon as IconReference | undefined;
  const iconPosition = content?.iconPosition || 'left';
  const iconOnly = content?.iconOnly || false;

  const wrapperClass = ["wp-block-button", extraClass].filter(Boolean).join(" ");
  const anchorClass = "wp-block-button__link wp-element-button";

  const iconElement = icon ? (
    <IconRenderer
      icon={icon}
      size={icon.size || 16}
      color="currentColor"
      strokeWidth={icon.strokeWidth || 2}
      style={{ flexShrink: 0 }}
    />
  ) : null;

  const label = iconOnly && icon ? (title || textContent || undefined) : undefined;

  const justifyFromTextAlign = mapTextAlignToJustifyContent(styles?.textAlign);
  const justifyContent =
    (styles?.justifyContent as React.CSSProperties["justifyContent"] | undefined) ??
    justifyFromTextAlign ??
    "center";
  const alignItems =
    (styles?.alignItems as React.CSSProperties["alignItems"] | undefined) ??
    "center";

  return (
    <div className={wrapperClass} role="presentation" onClick={(e) => (isPreview ? undefined : e.preventDefault())}>
      <a
        href={url}
        target={linkTarget}
        rel={rel}
        title={label}
        style={{
          ...styles,
          display: "inline-flex",
          alignItems,
          justifyContent,
          gap: iconElement && !iconOnly ? "6px" : undefined,
        }}
        className={anchorClass}
      >
        {iconElement && iconPosition === 'left' && iconElement}
        {!iconOnly && textContent}
        {iconElement && iconPosition === 'right' && iconElement}
      </a>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ButtonBlockComponent({
  value,
  onChange,
  isPreview,
}: BlockComponentProps) {
  const { content, styles } = useBlockState<ButtonContent>({
    value,
    getDefaultContent: () => DEFAULT_CONTENT,
    onChange,
  });

  return (
    <ButtonRenderer content={content} styles={styles} isPreview={isPreview} />
  );
}

// ============================================================================
// SETTINGS COMPONENT
// ============================================================================

interface ButtonSettingsProps {
  block: BlockConfig;
  onUpdate?: (updates: Partial<BlockConfig>) => void;
}

function ButtonSettings({ block, onUpdate }: ButtonSettingsProps) {
  const accessor = getBlockStateAccessor(block.id);
  const [, setUpdateTrigger] = React.useState(0);

  // Get current state
  const content = accessor
    ? (accessor.getContent() as ButtonContent)
    : (block.content as ButtonContent) || DEFAULT_CONTENT;

  const currentIcon = content?.icon as IconReference | undefined;
  const iconRefFullLabel = currentIcon ? formatIconReferenceLabel(currentIcon) : '';
  const iconRefDisplayLabel = currentIcon
    ? truncateWithEllipsis({
        text: iconRefFullLabel,
        maxChars: NPB_ICON_REFERENCE_ROW_MAX_CHARS,
      })
    : '';

  // Update handlers
  const updateContent = (updates: Partial<ButtonContent>) => {
    if (accessor) {
      const current = accessor.getContent() as ButtonContent;
      accessor.setContent({ ...current, ...updates });
      setUpdateTrigger((prev) => prev + 1);
    } else if (onUpdate) {
      onUpdate({
        content: {
          ...block.content,
          ...updates,
        } as BlockContent,
      });
    }
  };

  const handleIconSelect = (icon: IconReference) => {
    updateContent({ icon });
  };

  const handleRemoveIcon = () => {
    updateContent({ icon: undefined, iconOnly: false, iconPosition: undefined });
  };

  return (
    <div className="space-y-4">
      <CollapsibleCard title="Content" icon={Type} defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="button-text" className="text-sm font-medium text-gray-700">Button Text</Label>
            <Input
              id="button-text"
              value={content?.kind === 'text' ? content.value : ''}
              onChange={(e) => updateContent({ kind: 'text', value: e.target.value } as ButtonContent)}
              placeholder="Button text"
              className="mt-1 h-9"
            />
          </div>
          
          <div>
            <Label htmlFor="button-url" className="text-sm font-medium text-gray-700">Link URL</Label>
            <Input
              id="button-url"
              value={content?.url || ''}
              onChange={(e) => updateContent({ url: e.target.value })}
              placeholder="https://example.com"
              className="mt-1 h-9"
            />
          </div>
        </div>
      </CollapsibleCard>

      <CollapsibleCard title="Icon" icon={Smile} defaultOpen={!!currentIcon}>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">Button Icon</Label>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              {currentIcon ? (
                <>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50">
                    <IconRenderer icon={currentIcon} size={16} />
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="min-w-0 flex-1 cursor-default text-xs text-gray-500"
                        title={iconRefFullLabel}>
                        {iconRefDisplayLabel}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs break-all">
                      {iconRefFullLabel}
                    </TooltipContent>
                  </Tooltip>
                  <button
                    type="button"
                    onClick={handleRemoveIcon}
                    className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Remove icon"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <IconPickerButton
                  onSelect={handleIconSelect}
                  variant="outline"
                  size="sm"
                />
              )}
              {currentIcon && (
                <IconPickerButton
                  className="shrink-0"
                  currentIcon={currentIcon}
                  onSelect={handleIconSelect}
                  variant="ghost"
                  size="sm"
                />
              )}
            </div>
          </div>

          {currentIcon && (
            <>
              <div>
                <Label className="text-sm font-medium text-gray-700">Position</Label>
                <div className="flex gap-2 mt-1">
                  {[
                    { value: 'left' as const, label: 'Left' },
                    { value: 'right' as const, label: 'Right' },
                  ].map((pos) => (
                    <button
                      key={pos.value}
                      onClick={() => updateContent({ iconPosition: pos.value })}
                      className={`h-8 px-3 text-xs font-medium rounded-md transition-all ${
                        (content?.iconPosition || 'left') === pos.value
                          ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                          : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Mode</Label>
                <div className="flex gap-2 mt-1">
                  {[
                    { value: false, label: 'With Text' },
                    { value: true, label: 'Icon Only' },
                  ].map((mode) => (
                    <button
                      key={String(mode.value)}
                      onClick={() => updateContent({ iconOnly: mode.value })}
                      className={`h-8 px-3 text-xs font-medium rounded-md transition-all ${
                        (content?.iconOnly || false) === mode.value
                          ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                          : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </CollapsibleCard>
      
      <CollapsibleCard title="Link Settings" icon={Link} defaultOpen={true}>
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">Link Target</Label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: '_self', label: 'Same Window' },
              { value: '_blank', label: 'New Window', icon: ExternalLink }
            ].map((target) => (
              <button
                key={target.value}
                onClick={() => updateContent({ linkTarget: target.value as '_self' | '_blank', target: undefined })}
                className={`h-8 px-3 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
                  (content?.linkTarget || content?.target || '_self') === target.value
                    ? "bg-gray-200 text-gray-800 hover:bg-gray-300" 
                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                }`}
              >
                {target.icon && <target.icon className="w-3 h-3" />}
                {target.label}
              </button>
            ))}
          </div>
        </div>
      </CollapsibleCard>
    </div>
  );
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const ButtonBlock: BlockDefinition = {
  id: 'core/button',
  label: 'Button',
  icon: MousePointer,
  description: 'Add a clickable button',
  category: 'basic',
  defaultContent: {
    kind: 'text',
    value: 'Click Me',
    url: '#',
    linkTarget: '_self',
    rel: '',
    title: '',
    className: '',
  },
  defaultStyles: {
    backgroundColor: '#007cba',
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '4px',
    border: 'none',
    fontSize: '16px',
    textAlign: 'center',
    display: 'inline-block',
    cursor: 'pointer',
  },
  component: ButtonBlockComponent,
  settings: ButtonSettings,
  hasSettings: true,
};

export default ButtonBlock;
