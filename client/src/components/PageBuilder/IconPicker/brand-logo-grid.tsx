import React, { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Media } from '@shared/schema-types';
import type { IconReference } from '@/lib/icon-indexes';
import { appendSiteIdToUrl } from '@/lib/site-api';
import { useActiveSite } from '@/hooks/useActiveSite';
import { cn } from '@/lib/utils';
import { slugifyIconName } from '@shared/icon-drawing';
import { SettingsChipGroup } from '../settings-chip-group';
import { searchBrandLogos, useSvglCatalog, type BrandLogo } from './use-svgl-catalog';

const RESULT_LIMIT = 72;

type LogoVariant = 'light' | 'dark';

const VARIANT_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

type BrandLogoGridProps = {
  search: string;
  currentIcon?: IconReference;
  onPick: (icon: IconReference) => void;
};

/** Reads the plain-language message the server sends with a refusal. */
async function readServerMessage(res: Response): Promise<string | undefined> {
  const body = (await res.json().catch(() => null)) as { message?: string } | null;
  return typeof body?.message === 'string' ? body.message : undefined;
}

/**
 * Brand logos from svgl.app. Searching happens in the browser; picking one asks the server to
 * copy that single logo (cleaned) into the media library, and the icon points at our copy.
 */
export function BrandLogoGrid({ search, currentIcon, onPick }: BrandLogoGridProps) {
  const { activeSiteId } = useActiveSite();
  const catalog = useSvglCatalog({ enabled: true });
  const [variant, setVariant] = useState<LogoVariant>('light');
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  const logos = useMemo(
    () => searchBrandLogos({ logos: catalog.data ?? [], query: search, limit: RESULT_LIMIT }),
    [catalog.data, search],
  );

  const pick = async (logo: BrandLogo) => {
    const useDark = variant === 'dark' && Boolean(logo.dark);
    const fileUrl = useDark && logo.dark ? logo.dark : logo.light;
    setPendingSlug(logo.slug);
    setPickError(null);
    try {
      const res = await fetch(appendSiteIdToUrl('/api/media/svgl', activeSiteId || undefined), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fileUrl, title: logo.title }),
      });
      if (!res.ok) {
        const message = await readServerMessage(res);
        console.error('[icon-picker] Brand logo save refused', { status: res.status, slug: logo.slug, message });
        setPickError(message ?? "That logo couldn't be added. Try again in a moment.");
        return;
      }
      const item = (await res.json()) as Media;
      onPick({
        iconSet: 'svgl',
        iconName: slugifyIconName(useDark ? `${logo.title} dark` : logo.title),
        url: item.url,
        label: logo.title,
        size: currentIcon?.size ?? 24,
        sizeUnit: currentIcon?.sizeUnit,
        color: currentIcon?.color ?? 'currentColor',
      });
    } catch (error) {
      console.error('[icon-picker] Brand logo save failed', { slug: logo.slug, error });
      setPickError("That logo couldn't be added. Check your connection and try again.");
    } finally {
      setPendingSlug(null);
    }
  };

  if (catalog.isLoading) {
    return (
      <div className="grid grid-cols-6 gap-2 pb-2 sm:grid-cols-8" aria-busy="true" aria-label="Loading brand logos">
        {Array.from({ length: 24 }, (_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-md bg-npb-surface-inset" />
        ))}
      </div>
    );
  }

  if (catalog.isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <p className="text-sm text-npb-text-secondary">Brand logos couldn't load.</p>
        <p className="text-xs text-npb-text-muted">Check your connection, then open this tab again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-2">
      <SettingsChipGroup
        label="Logo for backgrounds that are"
        ariaLabel="Logo version"
        options={VARIANT_OPTIONS}
        value={variant}
        onChange={(value) => setVariant(value === 'dark' ? 'dark' : 'light')}
      />
      {pickError ? (
        <p role="alert" className="text-xs text-npb-status-error">
          {pickError}
        </p>
      ) : null}
      {logos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <p className="text-sm text-npb-text-secondary">No logos match &ldquo;{search.trim()}&rdquo;</p>
          <p className="text-xs text-npb-text-muted">Try the brand's short name, like &ldquo;github&rdquo;.</p>
        </div>
      ) : (
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
          {logos.map((logo) => {
            const preview = variant === 'dark' && logo.dark ? logo.dark : logo.light;
            const isPending = pendingSlug === logo.slug;
            const isSelected = currentIcon?.iconSet === 'svgl' && currentIcon.label === logo.title;
            return (
              <button
                key={logo.slug}
                type="button"
                disabled={pendingSlug !== null}
                onClick={() => void pick(logo)}
                title={logo.title}
                aria-label={`Use the ${logo.title} logo`}
                className={cn(
                  'relative flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-md p-2 transition-colors disabled:cursor-wait',
                  variant === 'dark' ? 'bg-neutral-900 text-neutral-200' : '',
                  isSelected
                    ? 'ring-2 ring-npb-focus'
                    : 'border border-transparent hover:border-npb-border-default hover:bg-npb-interactive-bg-hover',
                )}
              >
                <img src={preview} alt="" loading="lazy" className="h-5 w-5 object-contain" />
                <span className="block w-full min-w-0 truncate text-center text-[10px] leading-tight opacity-70">
                  {logo.title}
                </span>
                {isPending ? (
                  <span className="absolute inset-0 flex items-center justify-center rounded-md bg-npb-surface-base/70">
                    <Loader2 className="h-4 w-4 animate-spin" aria-label="Adding logo" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
