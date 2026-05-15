import type { BlockConfig, BlockContent } from "@shared/schema-types";
import type { IconReference } from "@/lib/icon-indexes";
import { isNumericLengthUnit } from "@/lib/icon-indexes/types";

const DEFAULT_ICON: IconReference = {
  iconSet: "lucide",
  iconName: "star",
  size: 24,
  color: "currentColor",
  strokeWidth: 2,
};

export type IconContent = {
  icon: IconReference;
  link: string;
  linkTarget: "_self" | "_blank";
  label: string;
};

export const DEFAULT_ICON_CONTENT: IconContent = {
  icon: { ...DEFAULT_ICON },
  link: "",
  linkTarget: "_self",
  label: "",
};

function parseIconReference(raw: unknown): IconReference {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_ICON };
  const r = raw as Record<string, unknown>;
  const sizeUnit = isNumericLengthUnit(r.sizeUnit) ? r.sizeUnit : undefined;
  const strokeWidthUnit = isNumericLengthUnit(r.strokeWidthUnit)
    ? r.strokeWidthUnit
    : undefined;
  return {
    iconSet: (r.iconSet as IconReference["iconSet"]) || "lucide",
    iconName: typeof r.iconName === "string" ? r.iconName : "star",
    size: typeof r.size === "number" ? r.size : 24,
    sizeUnit,
    color: typeof r.color === "string" ? r.color : "currentColor",
    strokeWidth: typeof r.strokeWidth === "number" ? r.strokeWidth : 2,
    strokeWidthUnit,
  };
}

/**
 * Builds editor model from persisted content. Matches `{ kind: 'structured', data }`
 * (API / renderer) and legacy flat `{ icon, link, ... }` from older saves.
 */
export function parseIconContent(
  raw: BlockConfig["content"] | undefined,
): IconContent {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_ICON_CONTENT, icon: { ...DEFAULT_ICON } };
  }
  const r = raw as Record<string, unknown>;
  if (r.kind === "structured" && r.data && typeof r.data === "object") {
    const d = r.data as Record<string, unknown>;
    return {
      icon: parseIconReference(d.icon),
      link: typeof d.link === "string" ? d.link : "",
      linkTarget: d.linkTarget === "_blank" ? "_blank" : "_self",
      label: typeof d.label === "string" ? d.label : "",
    };
  }
  return {
    ...DEFAULT_ICON_CONTENT,
    ...(typeof r.link === "string" ? { link: r.link } : {}),
    ...(r.linkTarget === "_blank" ? { linkTarget: "_blank" as const } : {}),
    ...(typeof r.label === "string" ? { label: r.label } : {}),
    icon: parseIconReference(r.icon),
  };
}

export function serializeIconContent(c: IconContent): BlockContent {
  return {
    kind: "structured",
    data: {
      icon: { ...c.icon },
      link: c.link,
      linkTarget: c.linkTarget,
      label: c.label,
    },
  } as BlockContent;
}

export const STRUCTURED_DEFAULT_ICON_CONTENT = serializeIconContent(
  DEFAULT_ICON_CONTENT,
);
