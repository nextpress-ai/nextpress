export type SpacingSideQuad = {
  top: string;
  right: string;
  bottom: string;
  left: string;
};

/**
 * Expands CSS box shorthand into four sides.
 */
export const expandSpacingShorthand = (raw: unknown): SpacingSideQuad => {
  if (raw == null || raw === '') {
    return { top: '', right: '', bottom: '', left: '' };
  }
  const str = typeof raw === 'string' ? raw : String(raw);
  const values = str
    .split(/\s+/)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  if (values.length === 0) return { top: '', right: '', bottom: '', left: '' };
  if (values.length === 1) {
    const v = values[0]!;
    return { top: v, right: v, bottom: v, left: v };
  }
  if (values.length === 2) {
    const [a, b] = values as [string, string];
    return { top: a, right: b, bottom: a, left: b };
  }
  if (values.length === 3) {
    const [a, b, c] = values as [string, string, string];
    return { top: a, right: b, bottom: c, left: b };
  }
  const [a, b, c, d] = values as [string, string, string, string];
  return { top: a, right: b, bottom: c, left: d };
};

const overlayLonghands = ({
  styles,
  expanded,
  prefix,
}: {
  styles: Record<string, unknown>;
  expanded: SpacingSideQuad;
  prefix: 'padding' | 'margin';
}): SpacingSideQuad => {
  const pick = (longSuffix: string, side: keyof SpacingSideQuad): string => {
    const longKey = `${prefix}${longSuffix}`;
    const value = styles[longKey];
    if (value != null && String(value).trim() !== '') return String(value);
    return expanded[side];
  };
  return {
    top: pick('Top', 'top'),
    right: pick('Right', 'right'),
    bottom: pick('Bottom', 'bottom'),
    left: pick('Left', 'left'),
  };
};

/**
 * Resolves padding or margin sides from shorthand and longhand style keys.
 */
export const resolveSpacingSides = ({
  styles,
  prefix,
}: {
  styles: Record<string, unknown> | undefined;
  prefix: 'padding' | 'margin';
}): SpacingSideQuad => {
  const resolved = styles ?? {};
  const expanded = expandSpacingShorthand(resolved[prefix]);
  return overlayLonghands({ styles: resolved, expanded, prefix });
};
