import { useState, type JSX } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OptionButton } from '@/components/PageBuilder/shared/option-button';
import { OptionGroup, SettingsLabel } from '@/components/PageBuilder/shared';
import { ThemeColorRow } from '@/components/themes/theme-color-row';
import { ThemeFontSelect } from '@/components/themes/theme-font-select';
import {
  ADVANCED_COLOR_KEYS,
  COLOR_FIELD_LABELS,
  COLOR_PALETTE_PRESETS,
  ESSENTIAL_COLOR_KEYS,
  SHAPE_PRESETS,
  TYPE_SCALE_PRESETS,
} from '@/lib/theme-design-presets';
import {
  THEME_ICON_CHIP_SAMPLE,
  THEME_ICON_PREVIEW_SAMPLES,
  THEME_ICON_SET_OPTIONS,
} from '@/lib/theme-icon-set-options';
import { ThemeIconPreview } from '@/components/themes/theme-icon-preview';
import type { ThemeIconSetId } from '@/lib/theme-icon-set-options';
import type { ThemeSettings } from '@shared/theme-settings';
import { cn } from '@/lib/utils';

const COLOR_PICKER_PROPERTY: Partial<
  Record<keyof NonNullable<ThemeSettings['colors']>, 'backgroundColor' | 'color'>
> = {
  background: 'backgroundColor',
  foreground: 'color',
  muted: 'backgroundColor',
  mutedForeground: 'color',
  accent: 'backgroundColor',
  accentHover: 'backgroundColor',
  accentForeground: 'color',
  primary: 'backgroundColor',
  primaryForeground: 'color',
  secondary: 'backgroundColor',
  border: 'backgroundColor',
  destructive: 'backgroundColor',
};

type ThemeEditorPanelsProps = {
  themeId: string;
  draftName: string;
  draftDescription: string;
  onDraftNameChange: (value: string) => void;
  onDraftDescriptionChange: (value: string) => void;
  draft: ThemeSettings;
  activePaletteId: string | null;
  activeTypeScaleId: string;
  activeShapeId: string;
  activeIconSet: ThemeIconSetId;
  onApplyPalette: (paletteId: string) => void;
  onApplyTypeScale: (scaleId: string) => void;
  onApplyShapePreset: (shapeId: string) => void;
  onUpdateColor: (key: keyof NonNullable<ThemeSettings['colors']>, value: string) => void;
  onUpdateHeadingFont: (fontFamily: string) => void;
  onUpdateBodyFont: (fontFamily: string) => void;
  onUpdateTypography: (
    role: 'title' | 'subheading' | 'body' | 'small',
    field: 'fontSize' | 'lineHeight',
    value: string,
  ) => void;
  onUpdateDraft: (updater: (current: ThemeSettings) => ThemeSettings) => void;
};

const tabListClass =
  'grid h-auto min-h-10 w-full grid-cols-4 rounded-[var(--npb-radius-surface)] bg-npb-surface-inset p-1';

const tabTriggerClass =
  'flex min-h-9 items-center justify-center gap-1.5 rounded-[var(--npb-radius-input)] px-2 py-2 text-sm font-medium text-npb-text-muted transition-colors hover:bg-npb-interactive-bg-hover hover:text-npb-text-primary data-[state=active]:bg-npb-interactive-bg-active data-[state=active]:text-npb-interactive-text-active';

/** Tabbed theme controls — presets first, compact color rows, minimal scrolling. */
export function ThemeEditorPanels({
  themeId,
  draftName,
  draftDescription,
  draft,
  activePaletteId,
  activeTypeScaleId,
  activeShapeId,
  activeIconSet,
  onApplyPalette,
  onApplyTypeScale,
  onApplyShapePreset,
  onUpdateColor,
  onUpdateHeadingFont,
  onUpdateBodyFont,
  onUpdateTypography,
  onUpdateDraft,
}: ThemeEditorPanelsProps): JSX.Element {
  const [customSizesOpen, setCustomSizesOpen] = useState(false);
  const [moreColorsOpen, setMoreColorsOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          id={`theme-name-${themeId}`}
          value={draftName}
          onChange={(event) => onDraftNameChange(event.target.value)}
          placeholder="Theme name"
          className="h-9 rounded-none text-sm"
          aria-label="Theme name"
        />
        <Input
          id={`theme-description-${themeId}`}
          value={draftDescription}
          onChange={(event) => onDraftDescriptionChange(event.target.value)}
          placeholder="Description (optional)"
          className="h-9 rounded-none text-sm"
          aria-label="Theme description"
        />
      </div>

      <Tabs defaultValue="presets" className="flex flex-col">
      <TabsList className={tabListClass}>
        <TabsTrigger value="presets" className={tabTriggerClass}>
          Presets
        </TabsTrigger>
        <TabsTrigger value="colors" className={tabTriggerClass}>
          Colors
        </TabsTrigger>
        <TabsTrigger value="type" className={tabTriggerClass}>
          Type
        </TabsTrigger>
        <TabsTrigger value="extras" className={tabTriggerClass}>
          Extras
        </TabsTrigger>
      </TabsList>

      <TabsContent value="presets" className="mt-4 space-y-5 focus-visible:outline-none">
        <OptionGroup label="Color palette">
          {COLOR_PALETTE_PRESETS.map((preset) => (
            <OptionButton
              key={preset.id}
              isActive={activePaletteId === preset.id}
              onClick={() => onApplyPalette(preset.id)}
              ariaLabel={`Apply ${preset.label} palette`}
            >
              <span className="flex items-center gap-2">
                <span className="flex h-4 w-8 overflow-hidden rounded-sm border border-npb-border-default">
                  {preset.swatch.map((color) => (
                    <span key={color} className="min-w-0 flex-1" style={{ backgroundColor: color }} />
                  ))}
                </span>
                {preset.label}
              </span>
            </OptionButton>
          ))}
        </OptionGroup>

        <OptionGroup label="Type scale">
          {TYPE_SCALE_PRESETS.map((preset) => (
            <OptionButton
              key={preset.id}
              isActive={activeTypeScaleId === preset.id}
              onClick={() => onApplyTypeScale(preset.id)}
              ariaLabel={`Apply ${preset.label} type scale`}
            >
              {preset.label}
            </OptionButton>
          ))}
        </OptionGroup>

        <OptionGroup label="Corners">
          {SHAPE_PRESETS.map((preset) => (
            <OptionButton
              key={preset.id}
              isActive={activeShapeId === preset.id}
              onClick={() => onApplyShapePreset(preset.id)}
              ariaLabel={`Apply ${preset.label} corners`}
            >
              {preset.label}
            </OptionButton>
          ))}
        </OptionGroup>
      </TabsContent>

      <TabsContent value="colors" className="mt-4 focus-visible:outline-none">
        <div className="divide-y divide-npb-divider">
          {ESSENTIAL_COLOR_KEYS.map((key) => (
            <ThemeColorRow
              key={key}
              label={COLOR_FIELD_LABELS[key]}
              value={draft.colors?.[key] ?? ''}
              property={COLOR_PICKER_PROPERTY[key] ?? 'backgroundColor'}
              onChange={(value) => onUpdateColor(key, value)}
            />
          ))}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-3 h-8 px-2 text-npb-text-secondary"
          onClick={() => setMoreColorsOpen((open) => !open)}
        >
          <ChevronDown
            className={cn('mr-1.5 h-4 w-4 transition-transform', moreColorsOpen && 'rotate-180')}
          />
          More colors
        </Button>

        {moreColorsOpen ? (
          <div className="mt-2 divide-y divide-npb-divider border-t border-npb-divider pt-1">
            {ADVANCED_COLOR_KEYS.map((key) => (
              <ThemeColorRow
                key={key}
                label={COLOR_FIELD_LABELS[key]}
                value={draft.colors?.[key] ?? ''}
                property={COLOR_PICKER_PROPERTY[key] ?? 'backgroundColor'}
                onChange={(value) => onUpdateColor(key, value)}
              />
            ))}
          </div>
        ) : null}
      </TabsContent>

      <TabsContent value="type" className="mt-4 space-y-4 focus-visible:outline-none">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <SettingsLabel>Heading font</SettingsLabel>
            <ThemeFontSelect
              value={draft.typography?.title?.fontFamily}
              onValueChange={onUpdateHeadingFont}
            />
          </div>
          <div className="space-y-1.5">
            <SettingsLabel>Body font</SettingsLabel>
            <ThemeFontSelect
              value={draft.typography?.body?.fontFamily}
              onValueChange={onUpdateBodyFont}
            />
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-npb-text-secondary"
          onClick={() => setCustomSizesOpen((open) => !open)}
        >
          <ChevronDown
            className={cn('mr-1.5 h-4 w-4 transition-transform', customSizesOpen && 'rotate-180')}
          />
          Custom sizes
        </Button>

        {customSizesOpen ? (
          <div className="space-y-2">
            {(['title', 'subheading', 'body', 'small'] as const).map((role) => (
              <div key={role} className="grid gap-2 sm:grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1fr)]">
                <SettingsLabel className="self-center capitalize">{role}</SettingsLabel>
                <Input
                  value={draft.typography?.[role]?.fontSize ?? ''}
                  onChange={(event) => onUpdateTypography(role, 'fontSize', event.target.value)}
                  placeholder="Size"
                  className="npb-settings-select-trigger h-9 rounded-none"
                />
                <Input
                  value={draft.typography?.[role]?.lineHeight ?? ''}
                  onChange={(event) => onUpdateTypography(role, 'lineHeight', event.target.value)}
                  placeholder="Line height"
                  className="npb-settings-select-trigger h-9 rounded-none"
                />
              </div>
            ))}
          </div>
        ) : null}
      </TabsContent>

      <TabsContent value="extras" className="mt-4 space-y-4 focus-visible:outline-none">
        <OptionGroup label="Icon library">
          {THEME_ICON_SET_OPTIONS.map((option) => (
            <OptionButton
              key={option.id}
              isActive={activeIconSet === option.id}
              onClick={() =>
                onUpdateDraft((current) => ({
                  ...current,
                  icons: { set: option.id },
                }))
              }
              ariaLabel={`Use ${option.label} icons on new pages`}
            >
              <span className="flex items-center gap-2">
                <ThemeIconPreview icon={THEME_ICON_CHIP_SAMPLE[option.id]} size={15} />
                {option.label}
              </span>
            </OptionButton>
          ))}
        </OptionGroup>

        <div className="flex items-center gap-3 text-npb-text-primary">
          {THEME_ICON_PREVIEW_SAMPLES[activeIconSet].map((icon) => (
            <ThemeIconPreview key={`${icon.iconSet}:${icon.iconName}`} icon={icon} size={20} />
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <SettingsLabel hint="Primary buttons on new pages">Button font</SettingsLabel>
            <ThemeFontSelect
              value={draft.buttons?.fontFamily ?? draft.typography?.body?.fontFamily}
              onValueChange={(fontFamily) =>
                onUpdateDraft((current) => ({
                  ...current,
                  buttons: { ...current.buttons, fontFamily },
                }))
              }
              placeholder="Same as body"
            />
          </div>
          <div className="space-y-1.5">
            <SettingsLabel hint="Overrides corner preset">Corner radius</SettingsLabel>
            <Input
              value={draft.shape?.radius ?? ''}
              onChange={(event) =>
                onUpdateDraft((current) => ({
                  ...current,
                  shape: { radius: event.target.value },
                }))
              }
              placeholder="0.5rem"
              className="npb-settings-select-trigger h-9 rounded-none"
            />
          </div>
        </div>
      </TabsContent>
    </Tabs>
    </div>
  );
}
