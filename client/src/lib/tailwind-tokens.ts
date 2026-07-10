import resolveConfig from 'tailwindcss/resolveConfig'
import { tailwindThemeExtend } from '@shared/tailwind-theme'
import { camelToKebab, STATE_MODIFIER_MAP } from '@shared/token-resolution'

const fullConfig = resolveConfig({
	content: [],
	theme: { extend: tailwindThemeExtend },
})

/** All color families with hex values, for swatch UI rendering */
export const tokenColors = fullConfig.theme.colors

/** Full spacing scale with resolved rem values */
export const tokenSpacing = fullConfig.theme.spacing

/** Font size scale */
export const tokenFontSize = fullConfig.theme.fontSize

/** Font weight scale */
export const tokenFontWeight = fullConfig.theme.fontWeight

/** Border radius scale */
export const tokenBorderRadius = fullConfig.theme.borderRadius

/** Responsive breakpoints (for modifier CSS generation) */
export const tokenScreens = fullConfig.theme.screens

/** Unit categories — available units per category */
export const unitCategories: Record<string, string[]> = {
  spacing: ["px", "rem", "em", "%"],
  font: ["px", "rem", "em"],
  dimension: ["px", "rem", "%", "vw", "vh", "dvh", "dvw", "svh"],
  border: ["px", "rem", "%"],
}

/** Maps CSS properties to their unit category */
export const propertyUnitCategoryMap: Record<string, string> = {
  paddingTop: "spacing",
  paddingRight: "spacing",
  paddingBottom: "spacing",
  paddingLeft: "spacing",
  marginTop: "spacing",
  marginRight: "spacing",
  marginBottom: "spacing",
  marginLeft: "spacing",
  gap: "spacing",
  fontSize: "font",
  lineHeight: "font",
  width: "dimension",
  height: "dimension",
  borderRadius: "border",
}

/** Maps CSS properties to Tailwind alias for UI display */
export const propertyAliasMap: Record<string, string> = {
  backgroundColor: "bg",
  color: "text",
  paddingTop: "pt",
  paddingRight: "pr",
  paddingBottom: "pb",
  paddingLeft: "pl",
  marginTop: "mt",
  marginRight: "mr",
  marginBottom: "mb",
  marginLeft: "ml",
  fontSize: "text",
  fontWeight: "font",
  lineHeight: "leading",
  width: "w",
  height: "h",
  borderRadius: "rounded",
  borderColor: "border",
  gap: "gap",
}

/** Maps modifier names to CSS pseudo-selectors — re-exported from shared */
export { STATE_MODIFIER_MAP as stateModifierMap } from '@shared/token-resolution'

/**
 * Resolves a token entry's value/variant to an actual CSS value
 * using the Tailwind resolved config theme data.
 */
export function resolveTokenValue(entry: import('@shared/schema-types').TokenEntry): string | null {
  if (!entry.value) return null

  const { property, value, variant } = entry

  // Color properties -> look up in theme.colors
  if (property === "backgroundColor" || property === "color" || property === "borderColor") {
    const colorGroup = (fullConfig.theme.colors as Record<string, any>)[value]
    if (typeof colorGroup === "string") return colorGroup
    if (colorGroup && variant) return colorGroup[variant] ?? null
    return null
  }

  // Spacing properties -> look up in theme.spacing
  if (entry.unitCategory === "spacing") {
    return (fullConfig.theme.spacing as Record<string, string>)[value] ?? null
  }

  // Font size -> look up in theme.fontSize
  if (property === "fontSize") {
    const fs = (fullConfig.theme.fontSize as Record<string, any>)[value]
    if (typeof fs === "string") return fs
    if (Array.isArray(fs)) return fs[0]
    return null
  }

  // Font weight -> look up in theme.fontWeight
  if (property === "fontWeight") {
    return (fullConfig.theme.fontWeight as Record<string, string>)[value] ?? null
  }

  // Border radius -> look up in theme.borderRadius
  if (property === "borderRadius") {
    return (fullConfig.theme.borderRadius as Record<string, string>)[value] ?? null
  }

  return null
}

/**
 * Composes a custom (non-token) entry's value with its unit category.
 */
export function composeCustomValue(entry: import('@shared/schema-types').TokenEntry, units: Record<string, string>): string | null {
  if (!entry.style) return null

  // If entry has a unitCategory, append the active unit for that category
  if (entry.unitCategory && units[entry.unitCategory]) {
    return `${entry.style}${units[entry.unitCategory]}`
  }

  // No unit needed (colors, etc.) - use style directly
  return entry.style
}

/**
 * Resolves a full tokenMap into a plain CSS inline style object.
 * Base entries (no modifier) become inline styles.
 * Modifier entries are returned separately for CSS rule generation.
 */
export function resolveTokenMap(
  tokenMap: Record<string, import('@shared/schema-types').TokenEntry>,
  units: Record<string, string>
): {
  style: Record<string, string>;
  modifierEntries: Array<{ entry: import('@shared/schema-types').TokenEntry; resolvedValue: string }>;
} {
  const inlineStyle: Record<string, string> = {}
  const modifierEntries: Array<{ entry: import('@shared/schema-types').TokenEntry; resolvedValue: string }> = []

  for (const entry of Object.values(tokenMap)) {
    const resolvedValue = entry.value
      ? resolveTokenValue(entry)
      : composeCustomValue(entry, units)

    if (!resolvedValue) continue

    if (entry.modifier) {
      modifierEntries.push({ entry, resolvedValue })
    } else {
      inlineStyle[entry.property] = resolvedValue
    }
  }

  return { style: inlineStyle, modifierEntries }
}

/** Converts camelCase CSS property to kebab-case — re-exported from shared */
export { camelToKebab } from '@shared/token-resolution'

/**
 * Generates a CSS rule for a modifier entry.
 * State modifiers produce pseudo-selector rules.
 * Responsive modifiers produce @media query rules.
 */
export function resolveModifierEntry(
  blockId: string,
  entry: import('@shared/schema-types').TokenEntry,
  resolvedValue: string,
  options?: { selector?: string },
): string {
  if (!entry.modifier) return ""

  const cssProp = camelToKebab(entry.property)
  const selector = options?.selector ?? `.block-${blockId}`

  // State modifier: hover, focus, active, etc.
  if (STATE_MODIFIER_MAP[entry.modifier]) {
    const pseudo = STATE_MODIFIER_MAP[entry.modifier]
    return `${selector}${pseudo} { ${cssProp}: ${resolvedValue}; }`
  }

  // Responsive modifier: sm, md, lg, xl, 2xl
  const breakpoint = (tokenScreens as Record<string, string>)[entry.modifier]
  if (breakpoint) {
    return `@media (min-width: ${breakpoint}) { ${selector} { ${cssProp}: ${resolvedValue}; } }`
  }

  return ""
}

/**
 * Generates all modifier CSS rules for a block.
 */
export function generateBlockModifierCSS(
  blockId: string,
  modifierEntries: Array<{ entry: import('@shared/schema-types').TokenEntry; resolvedValue: string }>,
  options?: { selector?: string },
): string {
  return modifierEntries
    .map(({ entry, resolvedValue }) =>
      resolveModifierEntry(blockId, entry, resolvedValue, options),
    )
    .filter(Boolean)
    .join("\n")
}