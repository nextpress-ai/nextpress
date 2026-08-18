import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle, Copy, Pencil, Plus, Upload } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ThemeColorPreview } from '@/components/themes/theme-color-preview';
import { CreateThemeDialog } from '@/components/themes/create-theme-dialog';
import { ThemeImportDialog } from '@/components/themes/theme-import-dialog';
import { themeEditorPath } from '@/lib/admin-content-routes';
import { apiRequest } from '@/lib/queryClient';
import { appendSiteIdToUrl } from '@/lib/site-api';
import { useActiveSite } from '@/hooks/useActiveSite';
import { useToast } from '@/hooks/use-toast';
import type { Theme } from '@shared/schema-types';
import { resolveThemeDisplayCopy, isSystemDefaultTheme } from '@shared/theme-display';
import { parseThemeSettings } from '@shared/theme-settings';

function sortThemes(themes: Theme[], activeThemeId: string | null | undefined): Theme[] {
  return [...themes].sort((left, right) => {
    if (left.id === activeThemeId) return -1;
    if (right.id === activeThemeId) return 1;
    if (isSystemDefaultTheme(left) && !isSystemDefaultTheme(right)) return -1;
    if (!isSystemDefaultTheme(left) && isSystemDefaultTheme(right)) return 1;
    return resolveThemeDisplayCopy(left).name.localeCompare(resolveThemeDisplayCopy(right).name);
  });
}

type CreateDialogState = {
  open: boolean;
  initialName?: string;
  initialDescription?: string;
  initialSettings?: ReturnType<typeof parseThemeSettings>;
  title?: string;
  submitLabel?: string;
};

export default function Themes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeSiteId } = useActiveSite();
  const [, setLocation] = useLocation();
  const [createDialog, setCreateDialog] = useState<CreateDialogState>({ open: false });
  const [importOpen, setImportOpen] = useState(false);

  const { data: themes, isLoading } = useQuery({
    queryKey: ['/api/themes'],
  });

  const { data: siteInfoResponse } = useQuery<{
    status: boolean;
    data: { activeThemeId: string | null };
  }>({
    queryKey: ['/api/site', { siteId: activeSiteId }],
    enabled: !!activeSiteId,
  });

  const activeThemeId = siteInfoResponse?.data?.activeThemeId;
  const themeList = (themes as Theme[] | undefined) ?? [];
  const sortedThemes = useMemo(
    () => sortThemes(themeList, activeThemeId),
    [themeList, activeThemeId],
  );

  const activateMutation = useMutation({
    mutationFn: async (themeId: string) => {
      return await apiRequest(
        'POST',
        appendSiteIdToUrl(`/api/themes/${themeId}/activate`, activeSiteId),
      );
    },
    onSuccess: () => {
      toast({ title: 'Theme activated', description: 'Your site now uses this theme.' });
      queryClient.invalidateQueries({ queryKey: ['/api/themes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/site'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/site-theme'] });
    },
    onError: () => {
      toast({
        title: 'Could not activate theme',
        description: 'Try again in a moment.',
        variant: 'destructive',
      });
    },
  });

  const openDuplicateFrom = (theme: Theme): void => {
    const copy = resolveThemeDisplayCopy(theme);
    setCreateDialog({
      open: true,
      initialName: `${copy.name} copy`,
      initialDescription: copy.description,
      initialSettings: parseThemeSettings(theme.settings),
      title: 'Create your own copy',
      submitLabel: 'Create copy',
    });
  };

  const handleCreated = (theme: Theme): void => {
    queryClient.invalidateQueries({ queryKey: ['/api/themes'] });
    setLocation(themeEditorPath(theme.id));
  };

  return (
    <AdminLayout
      title="Themes"
      actions={
        <>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button className="npb-btn-accent" onClick={() => setCreateDialog({ open: true })}>
            <Plus className="mr-2 h-4 w-4" />
            New theme
          </Button>
        </>
      }
    >
      <Card className="admin-surface">
        <CardContent className="pt-4">
          {isLoading ? (
            <div role="status" className="py-12 text-center text-npb-text-muted">
              Loading themes…
            </div>
          ) : sortedThemes.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-npb-text-muted">No themes yet.</p>
              <Button className="mt-4 npb-btn-accent" onClick={() => setCreateDialog({ open: true })}>
                <Plus className="mr-2 h-4 w-4" />
                Create your first theme
              </Button>
            </div>
          ) : (
            <Table className="admin-list-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[5.5rem]">Preview</TableHead>
                  <TableHead>Theme</TableHead>
                  <TableHead className="w-36">Status</TableHead>
                  <TableHead className="w-48 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedThemes.map((theme) => {
                  const themeCopy = resolveThemeDisplayCopy(theme);
                  const isActive = theme.id === activeThemeId;
                  const isBuiltIn = isSystemDefaultTheme(theme);
                  const settings = parseThemeSettings(theme.settings);

                  return (
                    <TableRow key={theme.id} data-state={isActive ? 'selected' : undefined}>
                      <TableCell>
                        <ThemeColorPreview
                          settings={settings}
                          compact
                          className="h-10 w-16 border border-npb-border-default"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <Link
                            href={themeEditorPath(theme.id)}
                            className="font-medium text-npb-text-primary hover:text-npb-accent"
                          >
                            {themeCopy.name}
                          </Link>
                          <div className="mt-0.5 line-clamp-1 text-sm text-npb-text-secondary">
                            {themeCopy.description}
                          </div>
                          {isBuiltIn ? (
                            <div className="mt-0.5 text-xs text-npb-text-muted">Built-in</div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isActive ? (
                          <Badge className="bg-npb-status-success/15 text-npb-status-success">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Active
                          </Badge>
                        ) : (
                          <span className="text-sm text-npb-text-muted">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isBuiltIn ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => openDuplicateFrom(theme)}
                            >
                              <Copy className="mr-1.5 h-4 w-4" />
                              Copy
                            </Button>
                          ) : (
                            <Button type="button" variant="ghost" size="sm" asChild>
                              <Link href={themeEditorPath(theme.id)}>
                                <Pencil className="mr-1.5 h-4 w-4" />
                                Edit
                              </Link>
                            </Button>
                          )}
                          {!isActive ? (
                            <Button
                              type="button"
                              size="sm"
                              className="npb-btn-accent"
                              onClick={() => activateMutation.mutate(theme.id)}
                              disabled={activateMutation.isPending}
                            >
                              Activate
                            </Button>
                          ) : (
                            <span className="text-sm text-npb-text-muted">In use</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateThemeDialog
        open={createDialog.open}
        onOpenChange={(open) => setCreateDialog((current) => ({ ...current, open }))}
        initialName={createDialog.initialName}
        initialDescription={createDialog.initialDescription}
        initialSettings={createDialog.initialSettings}
        title={createDialog.title}
        submitLabel={createDialog.submitLabel}
        onCreated={handleCreated}
      />

      <ThemeImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        mode="create"
        onImported={(theme) => setLocation(themeEditorPath(theme.id))}
      />
    </AdminLayout>
  );
}
