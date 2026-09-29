import React, { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Upload } from 'lucide-react';
import type { Media } from '@shared/schema-types';
import type { IconReference } from '@/lib/icon-indexes';
import { appendSiteIdToUrl } from '@/lib/site-api';
import { useActiveSite } from '@/hooks/useActiveSite';
import { cn } from '@/lib/utils';

/** Pictures that make sense as icons: small svg / png / webp files, not photos or brand-logo copies. */
const ICON_MIME_TYPES = new Set(['image/svg+xml', 'image/svg', 'image/png', 'image/webp']);
const ICON_MAX_BYTES = 300 * 1024;
const ACCEPT = '.svg,.png,.webp,image/svg+xml,image/png,image/webp';

const MIME_BY_EXTENSION: Record<string, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  webp: 'image/webp',
};

type YourIconsGridProps = {
  search: string;
  currentIcon?: IconReference;
  onPick: (icon: IconReference) => void;
};

const isIconPicture = (item: Media): boolean =>
  ICON_MIME_TYPES.has(item.mimeType) && item.size <= ICON_MAX_BYTES && !item.originalName.startsWith('svgl-');

/** Some systems leave an SVG's type empty; the server only accepts known picture types. */
const withPictureType = (file: File): File => {
  if (file.type) return file;
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const type = MIME_BY_EXTENSION[extension];
  return type ? new File([file], file.name, { type }) : file;
};

/**
 * Icons you upload yourself (svg, png or webp). One-colour icons can later be set to take the
 * icon colour in the icon's settings. Uploads land in the media library like any other picture.
 */
export function YourIconsGrid({ search, currentIcon, onPick }: YourIconsGridProps) {
  const { activeSiteId } = useActiveSite();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const library = useQuery<{ media: Media[] }>({
    queryKey: ['/api/media', { per_page: 100, siteId: activeSiteId }],
    enabled: Boolean(activeSiteId),
  });

  const icons = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (library.data?.media ?? [])
      .filter(isIconPicture)
      .filter((item) => !query || item.originalName.toLowerCase().includes(query) || item.alt?.toLowerCase().includes(query));
  }, [library.data, search]);

  const toReference = (item: Media): IconReference => ({
    iconSet: 'custom',
    iconName: item.originalName,
    url: item.url,
    label: item.alt || undefined,
    size: currentIcon?.size ?? 24,
    sizeUnit: currentIcon?.sizeUnit,
    color: currentIcon?.color ?? 'currentColor',
  });

  const upload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append('file', withPictureType(file));
      const res = await fetch(appendSiteIdToUrl('/api/media', activeSiteId || undefined), {
        method: 'POST',
        body: form,
        credentials: 'include',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null;
        console.error('[icon-picker] Icon upload refused', { status: res.status, file: file.name, body });
        setUploadError(body?.message ?? "That file couldn't be uploaded. Use an svg, png or webp icon.");
        return;
      }
      const item = (await res.json()) as Media;
      await queryClient.invalidateQueries({ queryKey: ['/api/media'] });
      onPick(toReference(item));
    } catch (error) {
      console.error('[icon-picker] Icon upload failed', { file: file.name, error });
      setUploadError("That file couldn't be uploaded. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3 pb-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void upload(file);
        }}
      />
      {uploadError ? (
        <p role="alert" className="text-xs text-npb-status-error">
          {uploadError}
        </p>
      ) : null}
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-md border border-dashed border-npb-border-strong p-2 text-npb-text-secondary transition-colors hover:bg-npb-interactive-bg-hover disabled:cursor-wait"
          aria-label="Upload an icon (svg, png or webp)"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Upload className="h-5 w-5" aria-hidden />}
          <span className="text-[10px] leading-tight">{uploading ? 'Uploading' : 'Upload'}</span>
        </button>
        {library.isLoading
          ? Array.from({ length: 7 }, (_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-md bg-npb-surface-inset" />
            ))
          : icons.map((item) => {
              const isSelected = currentIcon?.iconSet === 'custom' && currentIcon.url === item.url;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onPick(toReference(item))}
                  title={item.originalName}
                  className={cn(
                    'flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-md p-2 transition-colors',
                    isSelected
                      ? 'bg-npb-interactive-bg-active ring-2 ring-npb-focus'
                      : 'border border-transparent hover:border-npb-border-default hover:bg-npb-interactive-bg-hover',
                  )}
                >
                  <img src={item.url} alt="" loading="lazy" className="h-5 w-5 object-contain" />
                  <span className="block w-full min-w-0 truncate text-center text-[10px] leading-tight text-npb-text-muted">
                    {item.originalName}
                  </span>
                </button>
              );
            })}
      </div>
      {!library.isLoading && icons.length === 0 ? (
        <p className="text-xs text-npb-text-muted">
          {search.trim() ? 'No uploaded icons match that name.' : 'No icons yet. Upload an svg, png or webp.'}
        </p>
      ) : null}
    </div>
  );
}
