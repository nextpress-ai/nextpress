import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Copy, KeyRound, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  formatApiKeyScopeLabel,
  pairedReadScopeId,
  type ApiKeyScopeId,
  type ApiKeyScopeMeta,
  type ApiKeyScopePreset,
} from '@shared/api-key-scopes';
import { ApiKeyScopesPicker } from './ApiKeyScopesPicker';

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  siteId: string;
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

const toggleScopeSelection = ({
  scopeId,
  checked,
  current,
}: {
  scopeId: ApiKeyScopeId;
  checked: boolean;
  current: ApiKeyScopeId[];
}): ApiKeyScopeId[] => {
  if (checked) {
    const next = current.includes(scopeId) ? current : [...current, scopeId];
    const readPair = pairedReadScopeId(scopeId);
    if (readPair && !next.includes(readPair)) {
      return [...next, readPair];
    }
    return next;
  }
  return current.filter((id) => id !== scopeId);
};

/** Dashboard-only API key management for SDK and automation tools. */
export function ApiKeysPanel() {
  const { activeSiteId, sites, formatSiteLabel } = useActiveSite();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('365');
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScopeId[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(DEFAULT_PRESET_ID);
  const [createSiteId, setCreateSiteId] = useState('');
  const [editingKey, setEditingKey] = useState<ApiKeyRow | null>(null);
  const [editScopes, setEditScopes] = useState<ApiKeyScopeId[]>([]);
  const [editActivePresetId, setEditActivePresetId] = useState<string | null>(null);
  const [revealedCredentials, setRevealedCredentials] = useState<{
    key: string;
    siteId: string;
  } | null>(null);

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

  const applyCreatePreset = (preset: ApiKeyScopePreset) => {
    setSelectedScopes([...preset.scopes]);
    setActivePresetId(preset.id);
  };

  const applyEditPreset = (preset: ApiKeyScopePreset) => {
    setEditScopes([...preset.scopes]);
    setEditActivePresetId(preset.id);
  };

  const openCreateDialog = () => {
    const defaultPreset =
      presets.find((preset) => preset.id === DEFAULT_PRESET_ID) ?? presets[0];
    if (defaultPreset) {
      applyCreatePreset(defaultPreset);
    } else {
      setSelectedScopes([]);
      setActivePresetId(null);
    }
    setCreateSiteId(activeSiteId ?? sites[0]?.id ?? '');
    setCreateOpen(true);
  };

  const openEditDialog = (key: ApiKeyRow) => {
    setEditingKey(key);
    setEditScopes([...(key.scopes ?? [])]);
    setEditActivePresetId(null);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth/api-keys', {
        name: newKeyName.trim(),
        siteId: createSiteId,
        expiresInDays: Number(expiresInDays),
        scopes: selectedScopes,
      });
      return response.json() as Promise<CreateKeyResponse>;
    },
    onSuccess: (result) => {
      setCreateOpen(false);
      setNewKeyName('');
      setRevealedCredentials({ key: result.key, siteId: result.siteId });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/api-keys'] });
      toast({
        title: 'API key created',
        description: 'Copy the key and site ID now. You will not be able to see them again.',
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

  const updateScopesMutation = useMutation({
    mutationFn: async ({ id, scopes }: { id: string; scopes: ApiKeyScopeId[] }) => {
      const response = await apiRequest('PATCH', `/api/auth/api-keys/${id}`, { scopes });
      return response.json() as Promise<ApiKeyRow>;
    },
    onSuccess: () => {
      setEditingKey(null);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/api-keys'] });
      toast({ title: 'Permissions updated' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Could not update permissions',
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

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copied` });
    } catch {
      toast({
        title: 'Copy failed',
        description: `Select the ${label.toLowerCase()} and copy it manually.`,
        variant: 'destructive',
      });
    }
  };

  const revealedSite = revealedCredentials
    ? sites.find((site) => site.id === revealedCredentials.siteId)
    : null;

  const editingSite = editingKey
    ? sites.find((site) => site.id === editingKey.siteId)
    : null;

  const keys = data?.keys ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-npb-text-secondary">
            Create keys here for scripts, agents, or integrations. You can change permissions anytime.
          </p>
        </div>
        <Button
          type="button"
          className="npb-btn-accent shrink-0"
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
                      No permissions assigned. Edit permissions or revoke this key.
                    </p>
                  )}
                  <p className="text-xs text-npb-text-muted">
                    Site: {keySite ? formatSiteLabel(keySite) : 'Unknown site'} · Created{' '}
                    {key.createdAt ? format(new Date(key.createdAt), 'MMM d, yyyy') : '—'}
                    {key.expiresAt
                      ? ` · Expires ${format(new Date(key.expiresAt), 'MMM d, yyyy')}`
                      : ''}
                    {key.lastUsedAt
                      ? ` · Last used ${format(new Date(key.lastUsedAt), 'MMM d, yyyy')}`
                      : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!!expired}
                    onClick={() => openEditDialog(key)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit permissions
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    disabled={revokeMutation.isPending}
                    onClick={() => revokeMutation.mutate(key.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Revoke
                  </Button>
                </div>
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
              Name the key and choose what it can do. You can change permissions later.
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
              <Label htmlFor="api-key-site">Site</Label>
              <Select value={createSiteId} onValueChange={setCreateSiteId}>
                <SelectTrigger id="api-key-site">
                  <SelectValue placeholder="Choose a site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {formatSiteLabel(site)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-npb-text-muted">
                This key only works for the site you choose here.
              </p>
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
            <ApiKeyScopesPicker
              idPrefix="create"
              catalog={catalog}
              presets={presets}
              selectedScopes={selectedScopes}
              activePresetId={activePresetId}
              onApplyPreset={applyCreatePreset}
              onToggleScope={(scopeId, checked) => {
                setActivePresetId(null);
                setSelectedScopes((current) =>
                  toggleScopeSelection({ scopeId, checked, current }),
                );
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="npb-btn-accent"
              disabled={
                !newKeyName.trim() ||
                !createSiteId ||
                selectedScopes.length === 0 ||
                createMutation.isPending
              }
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? 'Creating…' : 'Create key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingKey)} onOpenChange={(open) => !open && setEditingKey(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit permissions</DialogTitle>
            <DialogDescription>
              {editingKey
                ? `Update what ${editingKey.name} can do${
                    editingSite ? ` on ${formatSiteLabel(editingSite)}` : ''
                  }. Changes apply immediately.`
                : 'Update key permissions.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <ApiKeyScopesPicker
              idPrefix="edit"
              catalog={catalog}
              presets={presets}
              selectedScopes={editScopes}
              activePresetId={editActivePresetId}
              onApplyPreset={applyEditPreset}
              onToggleScope={(scopeId, checked) => {
                setEditActivePresetId(null);
                setEditScopes((current) =>
                  toggleScopeSelection({ scopeId, checked, current }),
                );
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditingKey(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="npb-btn-accent"
              disabled={editScopes.length === 0 || updateScopesMutation.isPending}
              onClick={() =>
                editingKey &&
                updateScopesMutation.mutate({ id: editingKey.id, scopes: editScopes })
              }
            >
              {updateScopesMutation.isPending ? 'Saving…' : 'Save permissions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(revealedCredentials)}
        onOpenChange={(open) => !open && setRevealedCredentials(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy your new API key</DialogTitle>
            <DialogDescription>
              This is the only time the full key is shown. Store the key and site ID somewhere safe.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="revealed-api-key">API key</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() =>
                    revealedCredentials && copyValue(revealedCredentials.key, 'API key')
                  }
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              </div>
              <div
                id="revealed-api-key"
                className="rounded-md border border-npb-border-default bg-npb-surface-inset p-3 font-mono text-sm break-all"
              >
                {revealedCredentials?.key}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="revealed-site-id">Site ID</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() =>
                    revealedCredentials && copyValue(revealedCredentials.siteId, 'Site ID')
                  }
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              </div>
              <div
                id="revealed-site-id"
                className="rounded-md border border-npb-border-default bg-npb-surface-inset p-3 font-mono text-sm break-all"
              >
                {revealedCredentials?.siteId}
              </div>
              {revealedSite ? (
                <p className="text-xs text-npb-text-muted">
                  Site: {formatSiteLabel(revealedSite)}
                </p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRevealedCredentials(null)}>
              Done
            </Button>
            <Button
              type="button"
              className="npb-btn-accent"
              onClick={() =>
                revealedCredentials && copyValue(revealedCredentials.key, 'API key')
              }
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
