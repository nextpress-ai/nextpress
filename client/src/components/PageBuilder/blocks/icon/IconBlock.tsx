import React from "react";
import type { BlockConfig, BlockContent } from "@shared/schema-types";
import type { BlockDefinition, BlockComponentProps } from "../types.ts";
import { useBlockState } from "../useBlockState";
import { IconRenderer } from "../shared/IconRenderer";
import type { IconReference } from "@/lib/icon-indexes";
import {
  parseIconContent,
  serializeIconContent,
  DEFAULT_ICON_CONTENT,
  STRUCTURED_DEFAULT_ICON_CONTENT,
  type IconContent,
} from "./icon-block-model";
import { IconBlockSettings } from "./icon-block-settings";
import { Smile } from "lucide-react";

// ============================================================================
// RENDERER
// ============================================================================

interface IconRendererBlockProps {
  content: IconContent;
  styles?: React.CSSProperties;
  isPreview?: boolean;
}

function effectiveGlyphColor(
  styles: React.CSSProperties | undefined,
  icon: IconReference,
): string | undefined {
  const fromStyles = styles?.color;
  if (typeof fromStyles === "string" && fromStyles.length > 0) return fromStyles;
  return icon.color;
}

function iconBoxCss(icon: IconReference): React.CSSProperties {
  const unit = icon.sizeUnit ?? "px";
  if (unit === "px") return {};
  const n = icon.size ?? 24;
  const box = `${n}${unit}`;
  return { width: box, height: box };
}

function IconBlockRenderer({ content, styles, isPreview }: IconRendererBlockProps) {
  const icon = content?.icon ?? DEFAULT_ICON_CONTENT.icon;
  const link = content?.link;
  const linkTarget = content?.linkTarget || "_self";
  const label = content?.label;
  const sizeUnit = icon.sizeUnit ?? "px";
  const strokeUnit = icon.strokeWidthUnit ?? "px";

  const box = iconBoxCss(icon);
  const glyphColor = effectiveGlyphColor(styles, icon);
  const strokeWidthProp =
    strokeUnit === "px"
      ? (icon.strokeWidth ?? 2)
      : `${icon.strokeWidth ?? 2}${strokeUnit}`;

  /** Block-level styles (padding, typography tokens, etc.) must not be forwarded onto the Lucide SVG — they can collapse or hide vector output. */
  const wrapperStyle: React.CSSProperties = {
    ...styles,
    ...box,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const iconElement = (
    <span className="wp-block-icon" style={wrapperStyle}>
      <IconRenderer
        icon={icon}
        size={sizeUnit === "px" ? (icon.size ?? 24) : "100%"}
        color={glyphColor}
        strokeWidth={strokeWidthProp}
        className="wp-block-icon__glyph"
        aria-label={label || undefined}
      />
    </span>
  );

  if (link && link !== "#" && !isPreview) {
    return (
      <a
        href={link}
        target={linkTarget}
        rel={linkTarget === "_blank" ? "noopener noreferrer" : undefined}
        title={label || undefined}
        style={{ textDecoration: "none", display: "inline-flex" }}>
        {iconElement}
      </a>
    );
  }

  return iconElement;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function IconBlockComponent({
  value,
  onChange,
  isPreview,
}: BlockComponentProps) {
  const valueForState = React.useMemo(
    () => ({
      ...value,
      content: parseIconContent(value.content) as unknown as BlockContent,
    }),
    [value],
  );

  const persistOnChange = React.useCallback(
    (block: BlockConfig) => {
      const parsed = parseIconContent(block.content);
      onChange({
        ...block,
        content: serializeIconContent(parsed),
      });
    },
    [onChange],
  );

  const { content, styles } = useBlockState<IconContent>({
    value: valueForState,
    getDefaultContent: () => ({
      ...DEFAULT_ICON_CONTENT,
      icon: { ...DEFAULT_ICON_CONTENT.icon },
    }),
    onChange: persistOnChange,
  });

  return <IconBlockRenderer content={content} styles={styles} isPreview={isPreview} />;
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const IconBlock: BlockDefinition = {
  id: "core/icon",
  label: "Icon",
  icon: Smile,
  description: "Add an icon from various icon sets",
  category: "basic",
  defaultContent: STRUCTURED_DEFAULT_ICON_CONTENT,
  defaultStyles: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  component: IconBlockComponent,
  settings: IconBlockSettings,
  hasSettings: true,
};

export default IconBlock;
