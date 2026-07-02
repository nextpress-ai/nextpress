import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Copy, KeyRound, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useActiveSite } from '@/hooks/useActiveSite';
import {
  API_KEY_SCOPE_GROUP_LABELS,
  formatApiKeyScopeLabel,
  type ApiKeyScopeId,
  type ApiKeyScopeMeta,
  type ApiKeyScopePreset,
} from '@shared/api-key-scopes';

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  siteId?: string | null;
  scopes?: ApiKeyScopeId[];
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  createdAt?: string | null;
};

type ApiKeysListResponse = {
  keys: ApiKeyRow[];
  total: number;
};

type ApiKeyScopesResponse = {
  catalog: ApiKeyScopeMeta[];
  presets: ApiKeyScopePreset[];
};

type CreateKeyResponse = ApiKeyRow & {
  key: string;
};

const EXPIRY_OPTIONS = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '180', label: '6 months' },
  { value: '365', label: '1 year' },
];

const DEFAULT_PRESET_ID = 'editor';

/** Dashboard-only API key management for SDK and automation tools. */
export function ApiKeysPanel() {
  const { activeSiteId, activeSite, sites, formatSiteLabel } = useActiveSite();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('365');
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScopeId[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(DEFAULT_PRESET_ID);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  const { data, isLoading } = useQuery<ApiKeysListResponse>({
    queryKey: ['/api/auth/api-keys'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/auth/api-keys');
      return response.json() as Promise<ApiKeysListResponse>;
    },
  });

  const { data: scopeData } = useQuery<ApiKeyScopesResponse>({
    queryKey: ['/api/auth/api-keys/scopes'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/auth/api-keys/scopes');
      return response.json() as Promise<ApiKeyScopesResponse>;
    },
  });

  const catalog = scopeData?.catalog ?? [];
  const presets = scopeData?.presets ?? [];

  const scopesByGroup = useMemo(() => {
    const groups = new Map<ApiKeyScopeMeta['group'], ApiKeyScopeMeta[]>();
    for (const entry of catalog) {
      const list = groups.get(entry.group) ?? [];
      list.push(entry);
      groups.set(entry.group, list);
    }
    return groups;
  }, [catalog]);

  const applyPreset = (preset: ApiKeyScopePreset) => {
    setSelectedScopes([...preset.scopes]);
    setActivePresetId(preset.id);
  };

  const openCreateDialog = () => {
    const defaultPreset =
      presets.find((preset) => preset.id === DEFAULT_PRESET_ID) ?? presets[0];
    if (defaultPreset) {
      applyPreset(defaultPreset);
    } else {
      setSelectedScopes([]);
      setActivePresetId(null);
    }
    setCreateOpen(true);
  };

  const toggleScope = (scopeId: ApiKeyScopeId, checked: boolean) => {
    setActivePresetId(null);
    setSelectedScopes((current) => {
      if (checked) {
        return current.includes(scopeId) ? current : [...current, scopeId];
      }
      return current.filter((id) => id !== scopeId);
    });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth/api-keys', {
        name: newKeyName.trim(),
        siteId: activeSiteId,
        expiresInDays: Number(expiresInDays),
        scopes: selectedScopes,
      });
      return response.json() as Promise<CreateKeyResponse>;
    },
    onSuccess: (result) => {
      setCreateOpen(false);
      setNewKeyName('');
      setRevealedKey(result.key);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/api-keys'] });
      toast({
        title: 'API key created',
        description: 'Copy it now. You will not be able to see it again.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Could not create key',
        description: error.message || 'Try again.',
        variant: 'destructive',
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/auth/api-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/api-keys'] });
      toast({ title: 'API key revoked' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Could not revoke key',
        description: error.message || 'Try again.',
        variant: 'destructive',
      });
    },
  });

  const copyKey = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: 'Copied to clipboard' });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Select the key and copy it manually.',
        variant: 'destructive',
      });
    }
  };

  const keys = data?.keys ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-npb-text-secondary">
            Create keys here for scripts, agents, or integrations. Choose what each key can access when you create it.
          </p>
        </div>
        <Button
          type="button"
          className="bg-npb-accent hover:bg-npb-accent-hover text-white shrink-0"
          onClick={openCreateDialog}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create API key
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-npb-text-muted">Loading keys…</p>
      ) : keys.length === 0 ? (
        <div className="rounded-lg border border-dashed border-npb-border-default p-8 text-center">
          <KeyRound className="mx-auto mb-3 h-8 w-8 text-npb-text-muted" />
          <p className="text-sm text-npb-text-secondary">No API keys yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => {
            const expired =
              key.expiresAt && new Date(key.expiresAt).getTime() < Date.now();
            const keyScopes = key.scopes ?? [];
            const keySite = key.siteId ? sites.find((site) => site.id === key.siteId) : null;
            return (
              <div
                key={key.id}
                className="flex flex-col gap-3 rounded-lg border border-npb-border-default bg-npb-surface-inset/60 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-npb-text-primary">{key.name}</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {key.keyPrefix}…
                    </Badge>
                    {expired ? <Badge variant="destructive">Expired</Badge> : null}
                  </div>
                  {keyScopes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {keyScopes.map((scopeId) => (
                        <Badge key={scopeId} variant="secondary" className="text-xs font-normal">
                          {formatApiKeyScopeLabel(scopeId)}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      No permissions assigned. Revoke and create a new key with the access you need.
                    </p>
                  )}
                  <p className="text-xs text-npb-text-muted">
                    {key.siteId
                      ? `Site: ${keySite ? formatSiteLabel(keySite) : 'Unknown site'} · `
                      : 'All sites · '}
                    Created{' '}
                    {key.createdAt ? format(new Date(key.createdAt), 'MMM d, yyyy') : '—'}
                    {key.expiresAt
                      ? ` · Expires ${format(new Date(key.expiresAt), 'MMM d, yyyy')}`
                      : ''}
                    {key.lastUsedAt
                      ? ` · Last used ${format(new Date(key.lastUsedAt), 'MMM d, yyyy')}`
                      : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-red-600 hover:text-red-700"
                  disabled={revokeMutation.isPending}
                  onClick={() => revokeMutation.mutate(key.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Revoke
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>
              Name the key and choose what it can do. You can revoke it anytime.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="api-key-name">Name</Label>
              <Input
                id="api-key-name"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Production deploy"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-key-expiry">Expires after</Label>
              <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                <SelectTrigger id="api-key-expiry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label>Permissions</Label>
              {activeSite ? (
                <p className="text-xs text-npb-text-muted">
                  This key is limited to {formatSiteLabel(activeSite)}.
                </p>
              ) : null}
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
                      onClick={() => applyPreset(preset)}
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
                      return (
                        <label
                          key={entry.id}
                          htmlFor={`scope-${entry.id}`}
                          className="flex cursor-pointer items-start gap-3"
                        >
                          <Checkbox
                            id={`scope-${entry.id}`}
                            checked={checked}
                            onCheckedChange={(value) => toggleScope(entry.id, Boolean(value))}
                            className="mt-0.5"
                          />
                          <span className="min-w-0 space-y-0.5">
                            <span className="block text-sm font-medium text-npb-text-primary">
                              {entry.label}
                            </span>
                            <span className="block text-xs text-npb-text-muted">
                              {entry.description}
                            </span>
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-npb-accent hover:bg-npb-accent-hover text-white"
              disabled={
                !newKeyName.trim() || selectedScopes.length === 0 || createMutation.isPending
              }
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? 'Creating…' : 'Create key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(revealedKey)} onOpenChange={(open) => !open && setRevealedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy your new API key</DialogTitle>
            <DialogDescription>
              This is the only time the full key is shown. Store it somewhere safe.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-npb-border-default bg-npb-surface-inset p-3 font-mono text-sm break-all">
            {revealedKey}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRevealedKey(null)}>
              Done
            </Button>
            <Button
              type="button"
              className="bg-npb-accent hover:bg-npb-accent-hover text-white"
              onClick={() => revealedKey && copyKey(revealedKey)}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
