import { useQuery } from '@tanstack/react-query';
import { slugifyIconName } from '@shared/icon-drawing';

/** svgl.app's public list of logos (about 670, ~130 KB). It allows browser requests. */
const SVGL_CATALOG_URL = 'https://api.svgl.app';

type SvglRoute = string | { light: string; dark: string };

type SvglApiEntry = {
  id: number;
  title: string;
  route: SvglRoute;
};

/** One logo in the picker. `dark` is the version drawn for dark backgrounds, when svgl has one. */
export type BrandLogo = {
  slug: string;
  title: string;
  light: string;
  dark?: string;
};

const toBrandLogo = (entry: SvglApiEntry): BrandLogo => ({
  // svgl repeats some titles (several "Arc" entries), so the id keeps each logo apart.
  slug: `${slugifyIconName(entry.title)}-${entry.id}`,
  title: entry.title,
  light: typeof entry.route === 'string' ? entry.route : entry.route.light,
  dark: typeof entry.route === 'string' ? undefined : entry.route.dark,
});

async function fetchSvglCatalog(): Promise<BrandLogo[]> {
  const res = await fetch(SVGL_CATALOG_URL);
  if (!res.ok) {
    throw new Error(`svgl catalog request failed (${res.status})`);
  }
  const entries = (await res.json()) as SvglApiEntry[];
  return entries
    .filter((entry) => typeof entry.title === 'string' && entry.route)
    .map(toBrandLogo)
    .sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Orders logos for a search: exact name, then names that start with it, then a word that starts
 * with it, then names that contain it. Brand names are short, so plain matching beats fuzzy here.
 */
export function searchBrandLogos({
  logos,
  query,
  limit,
}: {
  logos: readonly BrandLogo[];
  query: string;
  limit: number;
}): BrandLogo[] {
  const q = query.trim().toLowerCase();
  if (!q) return logos.slice(0, limit);
  const rank = (title: string): number => {
    const t = title.toLowerCase();
    if (t === q) return 0;
    if (t.startsWith(q)) return 1;
    if (t.split(/[\s.\-_/]+/).some((word) => word.startsWith(q))) return 2;
    if (t.includes(q)) return 3;
    return -1;
  };
  return logos
    .map((logo) => ({ logo, score: rank(logo.title) }))
    .filter((hit) => hit.score >= 0)
    .sort((a, b) => a.score - b.score || a.logo.title.length - b.logo.title.length)
    .slice(0, limit)
    .map((hit) => hit.logo);
}

/**
 * The brand logo list, loaded once per editor session and only when the Brand logos tab is open.
 * WHY live instead of bundled: no logo files in the repo or editor bundle, and new logos appear
 * without a release. Only the logo someone picks is copied into the site.
 */
export function useSvglCatalog({ enabled }: { enabled: boolean }) {
  return useQuery({
    queryKey: ['svgl-catalog'],
    queryFn: fetchSvglCatalog,
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });
}
