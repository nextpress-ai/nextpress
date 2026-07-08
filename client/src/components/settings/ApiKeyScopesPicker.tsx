import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  API_KEY_SCOPE_GROUP_LABELS,
  type ApiKeyScopeId,
  type ApiKeyScopeMeta,
  type ApiKeyScopePreset,
} from '@shared/api-key-scopes';

type ApiKeyScopesPickerProps = {
  idPrefix: string;
  catalog: ApiKeyScopeMeta[];
  presets: ApiKeyScopePreset[];
  selectedScopes: ApiKeyScopeId[];
  activePresetId: string | null;
  onApplyPreset: (preset: ApiKeyScopePreset) => void;
  onToggleScope: (scopeId: ApiKeyScopeId, checked: boolean) => void;
};

/** Grouped permission checkboxes and presets for API key create/edit forms. */
export function ApiKeyScopesPicker({
  idPrefix,
  catalog,
  presets,
  selectedScopes,
  activePresetId,
  onApplyPreset,
  onToggleScope,
}: ApiKeyScopesPickerProps) {
  const scopesByGroup = useMemo(() => {
    const groups = new Map<ApiKeyScopeMeta['group'], ApiKeyScopeMeta[]>();
    for (const entry of catalog) {
      const list = groups.get(entry.group) ?? [];
      list.push(entry);
      groups.set(entry.group, list);
    }
    return groups;
  }, [catalog]);

  return (
    <div className="space-y-3">
      <Label>Permissions</Label>
      {presets.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              size="sm"
              variant={activePresetId === preset.id ? 'default' : 'outline'}
              className={
                activePresetId === preset.id
                  ? 'bg-npb-accent hover:bg-npb-accent-hover text-white'
                  : undefined
              }
              onClick={() => onApplyPreset(preset)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      ) : null}
      {[...scopesByGroup.entries()].map(([group, entries]) => (
        <div key={group} className="space-y-2 rounded-md border border-npb-border-default p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-npb-text-muted">
            {API_KEY_SCOPE_GROUP_LABELS[group]}
          </p>
          <div className="space-y-3">
            {entries.map((entry) => {
              const checked = selectedScopes.includes(entry.id);
              const checkboxId = `${idPrefix}-scope-${entry.id}`;
              return (
                <label
                  key={entry.id}
                  htmlFor={checkboxId}
                  className="flex cursor-pointer items-start gap-3"
                >
                  <Checkbox
                    id={checkboxId}
                    checked={checked}
                    onCheckedChange={(value) => onToggleScope(entry.id, Boolean(value))}
                    className="mt-0.5"
                  />
                  <span className="min-w-0 space-y-0.5">
                    <span className="block text-sm font-medium text-npb-text-primary">
                      {entry.label}
                    </span>
                    <span className="block text-xs text-npb-text-muted">{entry.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
      {selectedScopes.length === 0 ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Select at least one permission.
        </p>
      ) : null}
    </div>
  );
}
