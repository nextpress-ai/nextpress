/**
 * Container block data model: content shape, defaults, sizing presets, and pure
 * length helpers. No React here — see `container-settings.tsx` for the UI.
 */

/**
 * Content for the container block: semantic tag + optional class name.
 * Visual sizing lives on `styles` (padding, maxWidth, background, etc.).
 */
export type ContainerContent = {
  tagName?: string;
  className?: string;
};

export const DEFAULT_CONTENT: ContainerContent = {
  tagName: "div",
  className: "",
};

/** Align with page design “Container width” options (`PageSettings.tsx`). */
export const MAX_WIDTH_PRESETS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "960px", label: "960px" },
  { value: "1024px", label: "1024px" },
  { value: "1200px", label: "1200px" },
  { value: "1440px", label: "1440px" },
  { value: "100%", label: "Full" },
] as const;

export const WIDTH_PRESETS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "__auto__", label: "Auto" },
  { value: "100%", label: "100%" },
  { value: "fit-content", label: "Fit" },
  { value: "max-content", label: "Max" },
] as const;

/** Min-height presets map to CSS (schema stays raw `styles.minHeight`). */
export const MIN_HEIGHT_PRESETS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "__auto__", label: "Auto" },
  { value: "10rem", label: "SM" },
  { value: "20rem", label: "MD" },
  { value: "32rem", label: "LG" },
  { value: "100dvh", label: "Full" },
] as const;

export const MAX_WIDTH_VALUES = new Set(MAX_WIDTH_PRESETS.map((p) => p.value));

const NUMERIC_LEN = /^(\d+(?:\.\d+)?)(px|rem)$/i;

export function parseNumericLength(value: string): { num: number; unit: "px" | "rem" } | null {
  const m = value.trim().match(NUMERIC_LEN);
  if (!m) return null;
  const unit = m[2].toLowerCase() === "rem" ? "rem" : "px";
  return { num: Number(m[1]), unit };
}

export function swapLengthUnit(value: string, target: "px" | "rem"): string | null {
  const parsed = parseNumericLength(value);
  if (!parsed) return null;
  const px = parsed.unit === "px" ? parsed.num : parsed.num * 16;
  if (target === "px") return `${Math.round(px * 1000) / 1000}px`;
  const rem = px / 16;
  const rounded = Math.round(rem * 1000) / 1000;
  return `${rounded}rem`;
}
