export type IconSearchHit = {
  name: string;
  score: number;
};

/** Collapses separators so `arrow right` matches `arrow-right`. */
export function normalizeIconQuery(value: string): string {
  return value.toLowerCase().replace(/[-_\s]+/g, "");
}

function scoreNormalizedMatch({ query, target }: { query: string; target: string }): number {
  if (!query || !target) return 0;
  if (target === query) return 1000;
  if (target.startsWith(query)) return 850 - Math.min(target.length, 80);
  if (target.includes(query)) return 650 - target.indexOf(query);

  let queryIndex = 0;
  let score = 280;
  let lastMatch = -1;

  for (let i = 0; i < target.length && queryIndex < query.length; i += 1) {
    if (target[i] !== query[queryIndex]) continue;
    score += 12;
    if (lastMatch === i - 1) score += 8;
    lastMatch = i;
    queryIndex += 1;
  }

  return queryIndex === query.length ? score : 0;
}

/**
 * Ranks icon names by fuzzy relevance. Empty query returns no hits — callers
 * should prompt the user to search instead of listing entire sets.
 */
export function scoreIconNameMatch({ query, name }: { query: string; name: string }): number {
  const trimmed = query.trim();
  if (!trimmed) return 0;

  const raw = name.toLowerCase();
  const q = trimmed.toLowerCase();
  const rawScore = scoreNormalizedMatch({ query: q, target: raw });
  const compactScore = scoreNormalizedMatch({
    query: normalizeIconQuery(trimmed),
    target: normalizeIconQuery(name),
  });

  return Math.max(rawScore, compactScore);
}

export function searchIconNames({
  names,
  query,
  limit = 72,
}: {
  names: readonly string[];
  query: string;
  limit?: number;
}): IconSearchHit[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const hits: IconSearchHit[] = [];
  for (const name of names) {
    const score = scoreIconNameMatch({ query: trimmed, name });
    if (score <= 0) continue;
    hits.push({ name, score });
  }

  hits.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return hits.slice(0, limit);
}
