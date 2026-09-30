import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLinkedPages, type LinkedPage } from '@/lib/page-transfer/page-transfer-api';

/** Ticked unless it is the homepage: a logo link should not drag the homepage along by default. */
const tickedByDefault = (page: LinkedPage): boolean => !page.isHomepage;

/**
 * Which linked pages travel with an export. Direct links show first; "pages those link to"
 * adds the next levels. Unticking is remembered per page while the dialog is open.
 */
export function useLinkedPageChoice({ pageId, enabled }: { pageId: string | undefined; enabled: boolean }) {
  const [includeDeeper, setIncludeDeeper] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const query = useQuery({
    queryKey: ['/api/page-transfer/links', pageId],
    queryFn: () => fetchLinkedPages(pageId!),
    enabled: enabled && Boolean(pageId),
  });

  const all = query.data?.pages ?? [];
  const visible = useMemo(() => all.filter((page) => page.depth === 1 || includeDeeper), [all, includeDeeper]);
  const isTicked = (page: LinkedPage): boolean => overrides[page.id] ?? tickedByDefault(page);
  const chosenIds = visible.filter(isTicked).map((page) => page.id);

  return {
    query,
    visible,
    missing: query.data?.missing ?? [],
    hasDeeper: all.some((page) => page.depth > 1),
    includeDeeper,
    setIncludeDeeper,
    isTicked,
    toggle: (page: LinkedPage) => setOverrides((prev) => ({ ...prev, [page.id]: !isTicked(page) })),
    chosenIds,
    reset: () => {
      setOverrides({});
      setIncludeDeeper(false);
    },
  };
}

export type LinkedPageChoice = ReturnType<typeof useLinkedPageChoice>;
