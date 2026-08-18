import type { PageDesignSettings } from "@shared/schema-types";

/** Merges site theme CSS vars with per-page design overrides for visitor surfaces. */
export function buildVisitorDocumentStyle({
  themeCssVars,
  design,
}: {
  themeCssVars?: Record<string, string>;
  design?: PageDesignSettings;
}): Record<string, string> {
  return {
    ...(themeCssVars ?? {}),
    ...(design?.backgroundColor?.style ? { backgroundColor: design.backgroundColor.style } : {}),
    ...(design?.textColor?.style ? { color: design.textColor.style } : {}),
    ...(design?.fontFamily ? { fontFamily: design.fontFamily } : {}),
  };
}
