import { useState, type JSX } from 'react';
import { Input } from '@/components/ui/input';
import type { TokenEntry } from '@shared/schema-types';
import { tokenColors, propertyAliasMap } from '@/lib/tailwind-tokens';
import { resolveTailwindColorToken } from '@/lib/resolve-tailwind-color-token';

type TokenColorPickerProps = {
  property: string;
  modifier?: string;
  currentEntry: TokenEntry | undefined;
  currentStyleValue?: string | undefined;
  onChange: (entry: TokenEntry) => void;
};

const COLOR_FAMILIES = [
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
];

const SHADE_KEYS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

const SPECIAL_COLORS = ['white', 'black', 'transparent'];

/**
 * Palette-first color picker for block and page design settings.
 * Palette view is the default; custom hex is the escape hatch.
 */
export default function TokenColorPicker({
  property,
  modifier,
  currentEntry,
  currentStyleValue,
  onChange,
}: TokenColorPickerProps): JSX.Element {
  const [showCustom, setShowCustom] = useState(false);

  const currentCustomValue = currentEntry?.style || currentStyleValue || '#000000';
  const alias = propertyAliasMap[property] || 'bg';

  const resolvedSelection =
    currentEntry?.value && currentEntry.value.trim() !== ''
      ? { family: currentEntry.value, shade: currentEntry.variant ?? null }
      : resolveTailwindColorToken(currentCustomValue);

  const handleTokenSelect = (family: string, shade: string | null, hexValue: string): void => {
    setShowCustom(false);
    onChange({
      property,
      value: family,
      variant: shade,
      alias,
      modifier,
      style: hexValue,
    });
  };

  const handleCustomChange = (hex: string): void => {
    onChange({
      property,
      value: '',
      variant: null,
      alias,
      modifier,
      style: hex,
    });
  };

  const isSelected = (family: string, shade: string | null): boolean => {
    if (!resolvedSelection) return false;
    return resolvedSelection.family === family && resolvedSelection.shade === shade;
  };

  const getHex = (family: string, shade?: string): string | null => {
    const colorGroup = (tokenColors as Record<string, Record<string, string> | string>)[family];
    if (!colorGroup) return null;
    if (typeof colorGroup === 'string') return colorGroup;
    if (shade && colorGroup[shade]) return colorGroup[shade];
    return null;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowCustom((current) => !current)}
          className={`rounded-none border px-2 py-1 text-xs transition-colors ${
            showCustom
              ? 'border-npb-border-strong bg-npb-interactive-bg-active text-npb-interactive-text-active'
              : 'border-npb-border-default bg-npb-interactive-bg text-npb-interactive-text hover:bg-npb-interactive-bg-hover'
          }`}
        >
          {showCustom ? '← Color palette' : 'Custom color'}
        </button>
      </div>

      {showCustom ? (
        <div className="flex gap-2">
          <Input
            type="color"
            value={currentCustomValue}
            onChange={(event) => handleCustomChange(event.target.value)}
            className="h-8 w-10 rounded-none border-npb-border-default p-1"
          />
          <Input
            value={currentCustomValue}
            onChange={(event) => handleCustomChange(event.target.value)}
            placeholder="#000000"
            className="h-8 flex-1 rounded-none border-npb-border-default text-xs focus:outline-none focus:ring-1 focus:ring-npb-border-strong"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-1">
            {SPECIAL_COLORS.map((name) => {
              const hex = getHex(name);
              if (!hex) return null;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleTokenSelect(name, null, hex)}
                  className={`h-6 w-6 border transition-all ${
                    isSelected(name, null)
                      ? 'border-npb-border-strong ring-2 ring-npb-focus ring-offset-1'
                      : 'border-npb-border-default hover:border-npb-border-strong'
                  }`}
                  style={{ backgroundColor: hex === 'transparent' ? 'transparent' : hex }}
                  title={name}
                >
                  {hex === 'transparent' ? (
                    <span className="text-xs leading-none text-npb-text-muted">∅</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="max-h-48 space-y-0.5 overflow-y-auto">
            {COLOR_FAMILIES.map((family) => {
              const colorGroup = (tokenColors as Record<string, Record<string, string> | string>)[family];
              if (!colorGroup || typeof colorGroup === 'string') return null;
              return (
                <div key={family} className="flex gap-0.5" title={family}>
                  {SHADE_KEYS.map((shade) => {
                    const hex = colorGroup[shade];
                    if (!hex || typeof hex !== 'string' || hex.startsWith('var(')) return null;
                    return (
                      <button
                        key={shade}
                        type="button"
                        onClick={() => handleTokenSelect(family, shade, hex)}
                        className={`h-4 w-4 flex-shrink-0 transition-all ${
                          isSelected(family, shade)
                            ? 'z-10 scale-125 ring-2 ring-npb-focus ring-offset-1'
                            : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: hex }}
                        title={`${family}-${shade}: ${hex}`}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
