import type { Media } from "@shared/schema-types";

const IMAGE_NAME_PATTERN = /\.(avif|bmp|gif|ico|jpe?g|png|svg|svgz|webp)$/i;

/**
 * Recognize raster/SVG uploads when `File.type` is missing or wrong (common for SVG).
 */
export function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return IMAGE_NAME_PATTERN.test(file.name);
}

/**
 * Treat library rows as images when MIME is image/* or filename looks like a still image asset.
 */
export function isImageMedia(m: Media): boolean {
  if (m.mimeType?.startsWith("image/")) return true;
  const label = `${m.originalName ?? ""} ${m.filename ?? ""}`;
  return IMAGE_NAME_PATTERN.test(label);
}
