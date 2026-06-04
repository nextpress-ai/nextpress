import React from "react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import type { BlockDefinition, BlockComponentProps } from "../types.ts";
import { Input } from "@/components/ui/input";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { SettingsLabel } from '../../shared';
import { MousePointer, ExternalLink, Type, Link, Smile, X } from "lucide-react";
import { useBlockState } from "../useBlockState";
import { useSettingsState } from "../useSettingsState";
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
  const { content, updateContent } = useSettingsState<ButtonContent>({
    block,
    onUpdate,
    defaultContent: DEFAULT_CONTENT,
  });

  const currentIcon = content?.icon as IconReference | undefined;
  const iconRefFullLabel = currentIcon ? formatIconReferenceLabel(currentIcon) : '';
  const iconRefDisplayLabel = currentIcon
    ? truncateWithEllipsis({
        text: iconRefFullLabel,
        maxChars: NPB_ICON_REFERENCE_ROW_MAX_CHARS,
      })
    : '';

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
            <SettingsLabel htmlFor="button-text">Button Text</SettingsLabel>
            <Input
              id="button-text"
              value={content?.kind === 'text' ? content.value : ''}
              onChange={(e) => updateContent({ kind: 'text', value: e.target.value } as ButtonContent)}
              placeholder="Button text"
              className="mt-1 h-9"
            />
          </div>
          
          <div>
            <SettingsLabel htmlFor="button-url">Link URL</SettingsLabel>
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
            <SettingsLabel>Button Icon</SettingsLabel>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              {currentIcon ? (
                <>
                  <div className="npb-settings-panel flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-npb-border-default bg-npb-surface-raised">
                    <IconRenderer icon={currentIcon} size={16} />
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="min-w-0 flex-1 cursor-default text-xs text-npb-text-muted"
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
                    className="shrink-0 rounded p-1 text-npb-text-muted hover:bg-npb-interactive-bg-hover hover:text-npb-text-secondary"
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
                <SettingsLabel>Position</SettingsLabel>
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
                            ? 'bg-npb-interactive-bg-active text-npb-interactive-text-active hover:bg-npb-interactive-bg-active'
                            : 'bg-npb-surface-base text-npb-text-secondary border border-npb-border-default hover:bg-npb-interactive-bg-hover hover:border-npb-border-strong'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <SettingsLabel>Mode</SettingsLabel>
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
                            ? 'bg-npb-interactive-bg-active text-npb-interactive-text-active hover:bg-npb-interactive-bg-active'
                            : 'bg-npb-surface-base text-npb-text-secondary border border-npb-border-default hover:bg-npb-interactive-bg-hover hover:border-npb-border-strong'
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
          <SettingsLabel>Link Target</SettingsLabel>
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
                    ? "bg-npb-interactive-bg-active text-npb-interactive-text-active hover:bg-npb-interactive-bg-active" 
                    : "bg-npb-surface-base text-npb-text-secondary border border-npb-border-default hover:bg-npb-interactive-bg-hover hover:border-npb-border-strong"
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
