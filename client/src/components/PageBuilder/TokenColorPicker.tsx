import type { JSX } from 'react';
import type { TokenEntry } from '@shared/schema-types';
import ColorField from './ColorField';

type TokenColorPickerProps = {
  property: string;
  modifier?: string;
  currentEntry: TokenEntry | null | undefined;
  currentStyleValue?: string | undefined;
  onChange: (entry: TokenEntry) => void;
  /** Read aloud with the current colour, e.g. "Text color". */
  ariaLabel?: string;
};

/**
 * One colour for one property. This is `ColorField` with a single target; use `ColorField`
 * directly when a block has two colours (background and text) so they share one control with a toggle.
 */
export default function TokenColorPicker({
  property,
  modifier,
  currentEntry,
  currentStyleValue,
  onChange,
  ariaLabel = 'Color',
}: TokenColorPickerProps): JSX.Element {
  return (
    <ColorField
      ariaLabel={ariaLabel}
      onChange={onChange}
      targets={[
        { property, label: ariaLabel, entry: currentEntry, styleValue: currentStyleValue, modifier },
      ]}
    />
  );
}
