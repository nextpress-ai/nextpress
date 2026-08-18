import type { JSX } from 'react';
import { BuilderSelect } from '@/components/PageBuilder/shared/builder-select';
import {
  PAGE_FONT_CATALOG,
  resolveFontCatalogValue,
} from '@shared/font-catalog';

type ThemeFontSelectProps = {
  id?: string;
  value: string | undefined;
  onValueChange: (fontFamily: string) => void;
  placeholder?: string;
};

/** Font picker using the same select chrome as block editor sidebar. */
export function ThemeFontSelect({
  id,
  value,
  onValueChange,
  placeholder = 'Choose a font',
}: ThemeFontSelectProps): JSX.Element {
  const resolvedValue = resolveFontCatalogValue(value);

  return (
    <BuilderSelect
      id={id}
      value={resolvedValue}
      onValueChange={onValueChange}
      placeholder={placeholder}
      options={PAGE_FONT_CATALOG.map((entry) => ({
        value: entry.value,
        label: <span style={{ fontFamily: entry.value }}>{entry.label}</span>,
      }))}
      ariaLabel={placeholder}
    />
  );
}
