import type { CSSProperties, JSX } from 'react';
import { ThemeIconPreview } from '@/components/themes/theme-icon-preview';
import { THEME_ICON_PREVIEW_SAMPLES } from '@/lib/theme-icon-set-options';
import type { ThemeIconSetId } from '@/lib/theme-icon-set-options';
import { cn } from '@/lib/utils';
import type { ThemeSettings } from '@shared/theme-settings';
import { themeSettingsToCssVars } from '@shared/theme-to-css-vars';

type ThemePreviewMockupProps = {
  settings: ThemeSettings;
  themeName?: string;
  className?: string;
};

/** Live visitor preview for the theme editor. */
export function ThemePreviewMockup({
  settings,
  themeName = 'Your site',
  className,
}: ThemePreviewMockupProps): JSX.Element {
  const cssVars = themeSettingsToCssVars(settings) as CSSProperties;
  const iconSet = (settings.icons?.set ?? 'lucide') as ThemeIconSetId;
  const icons = THEME_ICON_PREVIEW_SAMPLES[iconSet] ?? THEME_ICON_PREVIEW_SAMPLES.lucide;

  return (
    <div
      className={cn(
        'np-visitor-document flex min-h-[22rem] flex-col overflow-hidden rounded-[var(--npb-radius-surface)] border border-npb-border-default shadow-[var(--npb-shadow-surface)]',
        className,
      )}
      style={cssVars}
    >
      <div
        className="flex items-center justify-between gap-3 border-b px-4 py-2.5"
        style={{
          backgroundColor: 'var(--np-site-background)',
          borderColor: 'var(--np-site-border)',
          color: 'var(--np-site-foreground)',
        }}
      >
        <span
          className="truncate text-sm font-semibold"
          style={{ fontFamily: 'var(--np-site-font-title-family)' }}
        >
          {themeName}
        </span>
        <div
          className="hidden items-center gap-3 text-xs opacity-60 sm:flex"
          style={{ fontFamily: 'var(--np-site-font-body-family)' }}
        >
          <span>Home</span>
          <span>About</span>
        </div>
      </div>

      <div
        className="flex flex-1 flex-col gap-4 p-5"
        style={{
          backgroundColor: 'var(--np-site-background)',
          color: 'var(--np-site-foreground)',
        }}
      >
        <div className="space-y-2">
          <h1
            className="!text-[length:var(--np-site-font-title-size)] !leading-[var(--np-site-font-title-line-height)]"
            style={{ fontFamily: 'var(--np-site-font-title-family)' }}
          >
            Page heading
          </h1>
          <p
            className="!text-[length:var(--np-site-font-body-size)] !leading-[var(--np-site-font-body-line-height)] text-[color:var(--np-site-foreground)]/85"
            style={{ fontFamily: 'var(--np-site-font-body-family)' }}
          >
            Body text with an{' '}
            <span style={{ color: 'var(--np-site-accent)' }} className="underline">
              accent link
            </span>
            .
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="wp-block-button inline-block">
            <span
              className="wp-block-button__link inline-flex cursor-default items-center justify-center px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: 'var(--np-site-accent)',
                color: 'var(--np-site-accent-foreground)',
                borderRadius: 'var(--np-site-radius)',
                fontFamily: 'var(--np-site-button-font-family, var(--np-site-font-body-family))',
              }}
            >
              Primary
            </span>
          </span>
          <span
            className="inline-flex items-center justify-center px-4 py-2 text-sm"
            style={{
              backgroundColor: 'var(--np-site-secondary, var(--np-site-muted))',
              color: 'var(--np-site-foreground)',
              borderRadius: 'var(--np-site-radius)',
              fontFamily: 'var(--np-site-font-body-family)',
            }}
          >
            Secondary
          </span>
        </div>

        <div
          className="p-3"
          style={{
            backgroundColor: 'var(--np-site-muted)',
            color: 'var(--np-site-muted-foreground)',
            borderRadius: 'var(--np-site-radius)',
          }}
        >
          <p
            className="!text-[length:var(--np-site-font-small-size)]"
            style={{ fontFamily: 'var(--np-site-font-body-family)' }}
          >
            Muted surface for highlights or side notes.
          </p>
        </div>

        <div className="mt-auto flex items-center gap-3 pt-1 text-[color:var(--np-site-accent)]">
          {icons.map((icon) => (
            <ThemeIconPreview key={`${icon.iconSet}:${icon.iconName}`} icon={icon} size={20} />
          ))}
        </div>
      </div>
    </div>
  );
}
