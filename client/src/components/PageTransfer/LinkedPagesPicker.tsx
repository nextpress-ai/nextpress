import type { JSX } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import type { LinkedPageChoice } from './use-linked-page-choice';

/** Linked pages the owner can bring along in the same file, each with a tick box. */
export function LinkedPagesPicker({ choice, disabled }: { choice: LinkedPageChoice; disabled?: boolean }): JSX.Element {
  const { query, visible, missing, hasDeeper, includeDeeper, setIncludeDeeper, isTicked, toggle } = choice;

  if (query.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }
  if (query.isError) {
    return <p className="text-sm text-npb-status-error">Linked pages couldn't be listed. You can still export this page alone.</p>;
  }
  if (visible.length === 0 && missing.length === 0) {
    return <p className="text-sm text-npb-text-muted">This page doesn't link to other pages.</p>;
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm font-medium text-npb-text-primary">Bring linked pages along</p>
      {visible.length > 0 ? (
        <ul className="grid gap-2">
          {visible.map((page) => (
            <li key={page.id} className="flex items-start gap-3">
              <Checkbox
                id={`linked-page-${page.id}`}
                checked={isTicked(page)}
                onCheckedChange={() => toggle(page)}
                disabled={disabled}
              />
              <Label htmlFor={`linked-page-${page.id}`} className="grid gap-0.5 font-normal">
                <span className="font-medium text-npb-text-primary">
                  {page.title || 'Untitled'}
                  {page.isHomepage ? <span className="font-normal text-npb-text-muted"> · homepage</span> : null}
                </span>
                <span className="text-xs text-npb-text-muted">
                  /{page.slug}
                  {page.depth > 1 ? ` · linked from ${page.linkedFrom}` : ''}
                  {page.status === 'publish' ? '' : ' · draft'}
                </span>
              </Label>
            </li>
          ))}
        </ul>
      ) : null}
      {hasDeeper ? (
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="linked-include-deeper" className="text-sm font-normal text-npb-text-secondary">
            Also list the pages those link to
          </Label>
          <Switch
            id="linked-include-deeper"
            checked={includeDeeper}
            onCheckedChange={setIncludeDeeper}
            disabled={disabled}
          />
        </div>
      ) : null}
      {missing.length > 0 ? (
        <p className="text-xs text-npb-text-muted">
          Not on this site: {missing.join(', ')}. Links to {missing.length === 1 ? 'it' : 'them'} stay as they are.
        </p>
      ) : null}
    </div>
  );
}
