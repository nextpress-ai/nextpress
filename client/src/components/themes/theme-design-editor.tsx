import { useState, type FormEvent, type JSX } from 'react';
import { Button } from '@/components/ui/button';
import { ThemeEditorPanels } from '@/components/themes/theme-editor-panels';
import { ThemePreviewMockup } from '@/components/themes/theme-preview-mockup';
import { apiRequest } from '@/lib/queryClient';
import { appendSiteIdToUrl } from '@/lib/site-api';
import { useToast } from '@/hooks/use-toast';
import { COLOR_PALETTE_PRESETS, SHAPE_PRESETS, TYPE_SCALE_PRESETS } from '@/lib/theme-design-presets';
import type { ThemeIconSetId } from '@/lib/theme-icon-set-options';
import type { ThemeSettings } from '@shared/theme-settings';
import { DEFAULT_THEME_SETTINGS } from '@shared/theme-settings';
import { cn } from '@/lib/utils';

type ThemeDesignEditorProps = {
  themeId: string;
  siteId?: string;
  name: string;
  description: string;
  settings: ThemeSettings;
  formId?: string;
  layout?: 'page' | 'compact';
  onSaved?: () => void;
};

/**
 * Tabbed theme editor — presets first, compact color rows, minimal scrolling.
 */
export function ThemeDesignEditor({
  themeId,
  siteId,
  name,
  description,
  settings,
  formId = `theme-design-${themeId}`,
  layout = 'page',
  onSaved,
}: ThemeDesignEditorProps): JSX.Element {
  const { toast } = useToast();
  const [draftName, setDraftName] = useState(name);
  const [draftDescription, setDraftDescription] = useState(description);
  const [draft, setDraft] = useState<ThemeSettings>(() => structuredClone(settings));
  const [saving, setSaving] = useState(false);

  const updateDraft = (updater: (current: ThemeSettings) => ThemeSettings): void => {
    setDraft(updater);
  };

  const updateColor = (key: keyof NonNullable<ThemeSettings['colors']>, value: string): void => {
    updateDraft((current) => ({
      ...current,
      colors: { ...current.colors, [key]: value },
    }));
  };

  const applyPalette = (paletteId: string): void => {
    const preset = COLOR_PALETTE_PRESETS.find((entry) => entry.id === paletteId);
    if (!preset) return;
    updateDraft((current) => ({
      ...current,
      colors: { ...current.colors, ...preset.colors },
    }));
  };

  const applyTypeScale = (scaleId: string): void => {
    const preset = TYPE_SCALE_PRESETS.find((entry) => entry.id === scaleId);
    if (!preset) return;
    updateDraft((current) => ({
      ...current,
      typography: { ...current.typography, ...preset.typography },
    }));
  };

  const applyShapePreset = (shapeId: string): void => {
    const preset = SHAPE_PRESETS.find((entry) => entry.id === shapeId);
    if (!preset) return;
    updateDraft((current) => ({
      ...current,
      shape: { ...preset.shape },
      shadows: { ...preset.shadows },
    }));
  };

  const updateHeadingFont = (fontFamily: string): void => {
    updateDraft((current) => ({
      ...current,
      typography: {
        ...current.typography,
        title: { ...current.typography?.title, fontFamily },
        subheading: { ...current.typography?.subheading, fontFamily },
      },
    }));
  };

  const updateBodyFont = (fontFamily: string): void => {
    updateDraft((current) => ({
      ...current,
      typography: {
        ...current.typography,
        body: { ...current.typography?.body, fontFamily },
        small: { ...current.typography?.small, fontFamily },
      },
      buttons: { ...current.buttons, fontFamily },
    }));
  };

  const updateTypography = (
    role: 'title' | 'subheading' | 'body' | 'small',
    field: 'fontSize' | 'lineHeight',
    value: string,
  ): void => {
    updateDraft((current) => ({
      ...current,
      typography: {
        ...current.typography,
        [role]: { ...current.typography?.[role], [field]: value },
      },
    }));
  };

  const handleSave = async (): Promise<void> => {
    if (!draftName.trim()) {
      toast({
        title: 'Theme name required',
        description: 'Give your theme a name before saving.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      await apiRequest(
        'PATCH',
        appendSiteIdToUrl(`/api/themes/${themeId}`, siteId),
        {
          name: draftName.trim(),
          description: draftDescription.trim(),
          settings: draft,
        },
      );
      onSaved?.();
      toast({
        title: 'Theme saved',
        description: 'New pages will start with these settings.',
      });
    } catch {
      toast({
        title: 'Could not save theme',
        description: 'Try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void handleSave();
  };

  const activePaletteId =
    COLOR_PALETTE_PRESETS.find((preset) => preset.colors.accent === draft.colors?.accent)?.id ??
    null;

  const activeTypeScaleId =
    TYPE_SCALE_PRESETS.find(
      (preset) => preset.typography.title?.fontSize === draft.typography?.title?.fontSize,
    )?.id ?? 'default';

  const activeShapeId =
    SHAPE_PRESETS.find((preset) => preset.shape.radius === draft.shape?.radius)?.id ?? 'soft';

  const activeIconSet = (draft.icons?.set ?? 'lucide') as ThemeIconSetId;

  const settingsColumn = (
    <div className="flex flex-col gap-4">
      <div className="npb-editor-sidebar overflow-hidden rounded-lg border border-npb-border-default p-4">
        <ThemeEditorPanels
          themeId={themeId}
          draftName={draftName}
          draftDescription={draftDescription}
          onDraftNameChange={setDraftName}
          onDraftDescriptionChange={setDraftDescription}
          draft={draft}
          activePaletteId={activePaletteId}
          activeTypeScaleId={activeTypeScaleId}
          activeShapeId={activeShapeId}
          activeIconSet={activeIconSet}
          onApplyPalette={applyPalette}
          onApplyTypeScale={applyTypeScale}
          onApplyShapePreset={applyShapePreset}
          onUpdateColor={updateColor}
          onUpdateHeadingFont={updateHeadingFont}
          onUpdateBodyFont={updateBodyFont}
          onUpdateTypography={updateTypography}
          onUpdateDraft={updateDraft}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-npb-text-muted"
          disabled={saving}
          onClick={() => setDraft(structuredClone(DEFAULT_THEME_SETTINGS))}
        >
          Reset to defaults
        </Button>
        {layout === 'compact' ? (
          <Button type="submit" className="npb-btn-accent" disabled={saving}>
            Save theme
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      className={cn(
        layout === 'page' &&
          'grid items-start gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]',
        layout === 'compact' && 'space-y-6',
      )}
    >
      {settingsColumn}

      {layout === 'page' ? (
        <aside className="min-w-0 lg:sticky lg:top-24">
          <ThemePreviewMockup
            settings={draft}
            themeName={draftName.trim() || 'Your site'}
            className="w-full"
          />
        </aside>
      ) : (
        <ThemePreviewMockup settings={draft} />
      )}
    </form>
  );
}
