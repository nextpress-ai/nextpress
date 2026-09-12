import type { CSSProperties } from "react";

/** Editor-only: hug wraps the used content; span fills the layout slot. */
export type CanvasChromeMode = "hug" | "span";

export type CanvasChromeAlign = "left" | "center" | "right";

type ChromeStyleSource = CSSProperties & {
  contentAlignHorizontal?: string;
};

type ChromeContentSource = {
  textAlign?: string;
};

function readSideAlign(value: string | undefined): CanvasChromeAlign | null {
  if (value === "center" || value === "right" || value === "left") return value;
  return null;
}

/**
 * Pin wins over text align so a centered overlay heading keeps its box centered
 * after chrome shrinks to the words.
 */
export function readCanvasChromeAlign({
  styles,
  content,
}: {
  styles?: ChromeStyleSource;
  content?: ChromeContentSource;
}): CanvasChromeAlign {
  const pin = readSideAlign(styles?.contentAlignHorizontal);
  if (pin) return pin;
  const fromStyle = readSideAlign(
    typeof styles?.textAlign === "string" ? styles.textAlign : undefined,
  );
  if (fromStyle) return fromStyle;
  return readSideAlign(content?.textAlign) ?? "left";
}

/** Full-width slot so a hugged frame can still sit left / center / right. */
export function getCanvasChromeSlotStyle({
  mode,
  align,
}: {
  mode: CanvasChromeMode;
  align: CanvasChromeAlign;
}): CSSProperties {
  if (mode === "span") {
    return { width: "100%", minWidth: 0 };
  }
  return {
    width: "100%",
    minWidth: 0,
    textAlign: align,
  };
}

export function getCanvasChromeFrameStyle({
  mode,
}: {
  mode: CanvasChromeMode;
}): CSSProperties {
  if (mode === "span") {
    return {
      width: "100%",
      minWidth: 0,
      boxSizing: "border-box",
      display: "block",
    };
  }
  return {
    display: "inline-block",
    width: "fit-content",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    verticalAlign: "top",
    textAlign: "left",
  };
}

/**
 * Preview and span keep the published fill. Hug drops the 100% fallback so a
 * short heading can shrink; an author-set width still wins.
 */
export function getCanvasChromeInnerStyle({
  mode,
  explicitWidth,
  isPreview,
}: {
  mode: CanvasChromeMode;
  explicitWidth?: CSSProperties["width"];
  isPreview: boolean;
}): CSSProperties {
  if (explicitWidth != null && explicitWidth !== "") {
    return { width: explicitWidth, maxWidth: "100%" };
  }
  if (isPreview || mode === "span") {
    return { width: "100%" };
  }
  return { width: "fit-content", maxWidth: "100%" };
}
