const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNCTION_COLOR = /^(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|hwb)\(\s*[^()]+\)$/i;
const WORD_COLOR = /^(?:transparent|currentcolor)$/i;

/**
 * True for a colour we can safely save: hex (3, 4, 6, 8 digits), `rgb()`/`hsl()`-style functions,
 * `transparent`, or `currentColor`. Named colours are left out on purpose — the palette covers them
 * and a half-typed word like `re` must not be saved.
 */
export function isValidCssColor(text: string): boolean {
  const value = text.trim();
  if (value === '') return false;
  return HEX.test(value) || WORD_COLOR.test(value) || FUNCTION_COLOR.test(value);
}
