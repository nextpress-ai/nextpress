import { useRef, useState, type JSX } from 'react';
import type { TokenEntry } from '@shared/schema-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { tokenColors, propertyAliasMap } from '@/lib/tailwind-tokens';
import { normalizeHexColor, resolveTailwindColorToken } from '@/lib/resolve-tailwind-color-token';
import { describeTokenColor } from '@/lib/describe-token-color';
import { isValidCssColor } from '@/lib/is-valid-css-color';
import { SettingsDisclosure } from './shared';

/** One colour a field can set — e.g. a block's background, or its text. */
export type ColorTarget = {
  property: string;
  /** Short name on the toggle: "Background", "Text". */
  label: string;
  entry?: TokenEntry | null;
  styleValue?: string;
  modifier?: string;
};

type ColorFieldProps = {
  /** One target shows just the colours. Two or more add a toggle to switch between them. */
  targets: readonly ColorTarget[];
  onChange: (entry: TokenEntry) => void;
  /** Adds a Clear button for the colour being edited. */
  onClear?: (target: ColorTarget) => void;
  /** Which target is showing first. Defaults to the first one. */
  defaultProperty?: string;
  ariaLabel?: string;
};

type Swatch = { family: string; shade: string | null };

/** The quick picks: none, white, black, then one strong shade of each common hue. */
const PRESET_SWATCHES: readonly Swatch[] = [
  { family: 'transparent', shade: null },
  { family: 'white', shade: null },
  { family: 'black', shade: null },
  { family: 'slate', shade: '500' },
  { family: 'red', shade: '500' },
  { family: 'orange', shade: '500' },
  { family: 'amber', shade: '400' },
  { family: 'yellow', shade: '400' },
  { family: 'green', shade: '500' },
  { family: 'emerald', shade: '500' },
  { family: 'teal', shade: '500' },
  { family: 'sky', shade: '500' },
  { family: 'blue', shade: '500' },
  { family: 'indigo', shade: '500' },
  { family: 'purple', shade: '500' },
  { family: 'pink', shade: '500' },
];

const COLOR_FAMILIES = [
  'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime', 'green',
  'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose',
];
const SHADE_KEYS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

const swatchName = ({ family, shade }: Swatch): string => (shade ? `${family}-${shade}` : family);

const getHex = ({ family, shade }: Swatch): string | null => {
  const group = (tokenColors as Record<string, Record<string, string> | string>)[family];
  if (!group) return null;
  if (typeof group === 'string') return group;
  return shade && typeof group[shade] === 'string' && !group[shade]!.startsWith('var(') ? group[shade]! : null;
};

const targetKey = (target: ColorTarget): string =>
  target.modifier ? `${target.property}:${target.modifier}` : target.property;

/** `#rrggbb` for the native picker, which cannot show anything else. */
const toPickerHex = (color: string | null | undefined): string => {
  const hex = normalizeHexColor(color ?? '');
  return hex && hex.length === 7 ? hex : '#000000';
};

function SwatchButton({
  swatch,
  selected,
  onPick,
  size = 'preset',
}: {
  swatch: Swatch;
  selected: boolean;
  onPick: (swatch: Swatch, hex: string) => void;
  size?: 'preset' | 'shade';
}): JSX.Element | null {
  const hex = getHex(swatch);
  if (!hex) return null;
  const name = swatchName(swatch);
  return (
    <button
      type="button"
      title={`${name}: ${hex}`}
      aria-label={name}
      aria-pressed={selected}
      onClick={() => onPick(swatch, hex)}
      className={cn(
        'flex items-center justify-center border border-npb-border-default transition-all',
        size === 'preset' ? 'h-6 w-full' : 'h-4 w-4 flex-shrink-0 border-0',
        selected
          ? 'z-10 ring-2 ring-npb-focus ring-offset-1'
          : 'hover:scale-110 hover:border-npb-border-strong',
      )}
      style={{ backgroundColor: hex === 'transparent' ? undefined : hex }}
    >
      {hex === 'transparent' ? <span className="text-xs leading-none text-npb-text-muted">∅</span> : null}
    </button>
  );
}

/**
 * One colour control for a block: a Background / Text toggle, quick-pick swatches, and a
 * `[ Custom | value ]` group for any colour you can write (no unit dropdown — colours have no units).
 * The full palette is one click away under "All colors".
 */
export default function ColorField({
  targets,
  onChange,
  onClear,
  defaultProperty,
  ariaLabel = 'Color',
}: ColorFieldProps): JSX.Element {
  const [activeKey, setActiveKey] = useState<string>(
    () => (targets.find((target) => target.property === defaultProperty) ?? targets[0]!) && targetKey(
      targets.find((target) => target.property === defaultProperty) ?? targets[0]!,
    ),
  );
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const active = targets.find((target) => targetKey(target) === activeKey) ?? targets[0]!;
  const summary = describeTokenColor({ entry: active.entry ?? undefined, styleValue: active.styleValue });
  const alias = propertyAliasMap[active.property] || 'bg';

  const selection =
    !summary.isSet
      ? null
      : active.entry?.value && active.entry.value.trim() !== ''
        ? { family: active.entry.value, shade: active.entry.variant ?? null }
        : resolveTailwindColorToken(summary.swatch ?? undefined);
  const isSelected = (swatch: Swatch): boolean =>
    selection !== null && selection.family === swatch.family && selection.shade === swatch.shade;
  const isCustom = summary.isSet && selection === null;

  const pick = (swatch: Swatch, hex: string): void => {
    setDraft(null);
    onChange({
      property: active.property,
      value: swatch.family,
      variant: swatch.shade,
      alias,
      modifier: active.modifier,
      style: hex,
    });
  };

  const setCustom = (color: string): void => {
    onChange({
      property: active.property,
      value: '',
      variant: null,
      alias,
      modifier: active.modifier,
      style: color,
    });
  };

  const handleText = (text: string): void => {
    setDraft(text);
    if (isValidCssColor(text)) setCustom(text.trim());
  };

  const shownText = draft ?? (summary.swatch ?? '');
  const invalid = draft !== null && draft.trim() !== '' && !isValidCssColor(draft);
  const showHeader = targets.length > 1 || (onClear !== undefined && summary.isSet);

  return (
    <div className="space-y-2" role="group" aria-label={ariaLabel}>
      {showHeader ? (
        <div className="flex items-center justify-between gap-2">
          {targets.length > 1 ? (
            <div className="flex items-stretch" role="group" aria-label={`${ariaLabel} target`}>
              {targets.map((target, index) => {
                const state = describeTokenColor({
                  entry: target.entry ?? undefined,
                  styleValue: target.styleValue,
                });
                const on = targetKey(target) === targetKey(active);
                return (
                  <button
                    key={targetKey(target)}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setActiveKey(targetKey(target));
                      setDraft(null);
                    }}
                    className={cn(
                      'npb-settings-chip flex items-center gap-1.5 px-3 focus:outline-none',
                      index > 0 && '-ml-px',
                      on && 'npb-settings-chip--active',
                    )}
                  >
                    <span
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 border',
                        state.swatch ? 'border-npb-border-strong' : 'border-dashed border-npb-border-strong',
                      )}
                      style={state.swatch ? { backgroundColor: state.swatch } : undefined}
                      aria-hidden
                    />
                    {target.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <span />
          )}
          {onClear && summary.isSet ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-my-0.5 h-6 px-2 text-xs"
              onClick={() => onClear(active)}
            >
              Clear
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-8 gap-1.5">
        {PRESET_SWATCHES.map((swatch) => (
          <SwatchButton key={swatchName(swatch)} swatch={swatch} selected={isSelected(swatch)} onPick={pick} />
        ))}
      </div>

      <div className="flex items-stretch" role="group" aria-label={`${ariaLabel} custom color`}>
        <button
          type="button"
          aria-pressed={isCustom}
          onClick={() => {
            inputRef.current?.focus();
            inputRef.current?.select();
          }}
          className={cn(
            'npb-settings-chip flex shrink-0 items-center justify-center px-3 focus:outline-none',
            isCustom && 'npb-settings-chip--active',
          )}
        >
          Custom
        </button>
        <label
          className="relative -ml-px flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center border border-[var(--npb-chip-border)]"
          title="Pick a color"
        >
          <span
            className="h-5 w-5 border border-npb-border-strong"
            style={summary.swatch ? { backgroundColor: summary.swatch } : undefined}
            aria-hidden
          />
          <input
            type="color"
            value={toPickerHex(summary.swatch)}
            onChange={(event) => setCustom(event.target.value)}
            aria-label={`${ariaLabel} color picker`}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        <Input
          ref={inputRef}
          value={shownText}
          onChange={(event) => handleText(event.target.value)}
          onBlur={() => setDraft(null)}
          placeholder="#3b82f6"
          spellCheck={false}
          autoComplete="off"
          aria-label={`${ariaLabel} custom value`}
          aria-invalid={invalid || undefined}
          className={cn(
            'relative -ml-px h-9 min-w-0 flex-1 rounded-none text-sm focus-visible:z-10 focus-visible:outline-none',
            invalid && 'border-destructive',
          )}
        />
      </div>

      <SettingsDisclosure title="All colors">
        <div className="max-h-48 space-y-0.5 overflow-y-auto">
          {COLOR_FAMILIES.map((family) => (
            <div key={family} className="flex gap-0.5" title={family}>
              {SHADE_KEYS.map((shade) => {
                const swatch = { family, shade };
                return (
                  <SwatchButton key={shade} swatch={swatch} selected={isSelected(swatch)} onPick={pick} size="shade" />
                );
              })}
            </div>
          ))}
        </div>
      </SettingsDisclosure>
    </div>
  );
}
