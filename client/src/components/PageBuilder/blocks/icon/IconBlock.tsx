import React from "react";
import type { JSX } from "react";
import { Smile } from "lucide-react";
import { createBlockDefinition } from "../createBlockDefinition";
import { IconRenderer } from "../shared/IconRenderer";
import {
  parseIconContent,
  serializeIconContent,
  DEFAULT_ICON_CONTENT,
  type IconContent,
} from "./icon-block-model";
import { IconBlockSettings } from "./icon-block-settings";

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
  icon: IconContent["icon"],
): string | undefined {
  const fromStyles = styles?.color;
  if (typeof fromStyles === "string" && fromStyles.length > 0) return fromStyles;
  return icon.color;
}

function iconBoxCss(icon: IconContent["icon"]): React.CSSProperties {
  const unit = icon.sizeUnit ?? "px";
  if (unit === "px") return {};
  const n = icon.size ?? 24;
  const box = `${n}${unit}`;
  return { width: box, height: box };
}

function IconBlockRenderer({ content, styles, isPreview }: IconRendererBlockProps): JSX.Element {
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
        style={{ textDecoration: "none", display: "inline-flex" }}
      >
        {iconElement}
      </a>
    );
  }

  return iconElement;
}

// ============================================================================
// BLOCK DEFINITION
// ============================================================================

const IconBlock = createBlockDefinition<IconContent>({
  id: "core/icon",
  label: "Icon",
  icon: Smile,
  description: "Add an icon from various icon sets",
  category: "basic",
  defaultContent: {
    ...DEFAULT_ICON_CONTENT,
    icon: { ...DEFAULT_ICON_CONTENT.icon },
  },
  defaultStyles: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  settings: IconBlockSettings,
  hasSettings: true,
  parseContent: parseIconContent,
  serializeContent: serializeIconContent,
  render: ({ content, styles, isPreview }) => (
    <IconBlockRenderer content={content} styles={styles} isPreview={isPreview} />
  ),
});

export default IconBlock;
