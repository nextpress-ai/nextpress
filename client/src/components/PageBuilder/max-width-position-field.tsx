import type { CSSProperties, JSX } from 'react';
import {
  MAX_WIDTH_POSITION_OPTIONS,
  hasCappedWidth,
  maxWidthPositionStyles,
  readMaxWidthPosition,
  type MaxWidthPosition,
} from '@shared/max-width-position';
import { SettingsChipGroup } from './settings-chip-group';

type MaxWidthPositionFieldProps = {
  styles: CSSProperties | undefined;
  onChange: (patch: Record<string, string | null>) => void;
};

/**
 * Left / Center / Right for a block with a max width — the question that usually follows
 * "make it no wider than 1080px". Hidden until a max width is set.
 */
export function MaxWidthPositionField({ styles, onChange }: MaxWidthPositionFieldProps): JSX.Element | null {
  if (!hasCappedWidth(styles)) return null;
  return (
    <SettingsChipGroup
      label="Position"
      options={MAX_WIDTH_POSITION_OPTIONS.map((option) => ({ ...option }))}
      value={readMaxWidthPosition(styles) ?? ''}
      onChange={(next) => onChange(maxWidthPositionStyles({ position: next as MaxWidthPosition, styles }))}
    />
  );
}
