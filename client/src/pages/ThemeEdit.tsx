import { useState, type JSX } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useRoute } from 'wouter';
import { ArrowLeft, CheckCircle, Copy, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminLayout } from '@/components/AdminLayout';
import { CreateThemeDialog } from '@/components/themes/create-theme-dialog';
import { ThemeDesignEditor } from '@/components/themes/theme-design-editor';
import { ThemeImportDialog } from '@/components/themes/theme-import-dialog';
import { ThemePreviewMockup } from '@/components/themes/theme-preview-mockup';
import { themeEditorPath } from '@/lib/admin-content-routes';
import { downloadThemeExportFile } from '@/lib/theme-export-file';
import { apiRequest } from '@/lib/queryClient';
import { appendSiteIdToUrl } from '@/lib/site-api';
import { useActiveSite } from '@/hooks/useActiveSite';
import { useToast } from '@/hooks/use-toast';
import type { Theme } from '@shared/schema-types';
import { buildThemeExportDocument } from '@shared/theme-export';
import { isSystemDefaultTheme, resolveThemeDisplayCopy } from '@shared/theme-display';
import { parseThemeSettings } from '@shared/theme-settings';

const THEME_EDIT_FORM_ID = 'theme-edit-form';

/**
 * Dedicated page for viewing or editing a site theme design system.
 */
export default function ThemeEditPage(): JSX.Element {
  const [, params] = useRoute('/admin/themes/:id');
  const themeId = params?.id ?? '';
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeSiteId } = useActiveSite();
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { data: theme, isLoading, isError } = useQuery<Theme>({
    queryKey: [`/api/themes/${themeId}`],
    enabled: Boolean(themeId),
  });

  const { data: siteInfoResponse } = useQuery<{
    status: boolean;
    data: { activeThemeId: string | null };
  }>({
    queryKey: ['/api/site', { siteId: activeSiteId }],
    enabled: !!activeSiteId,
  });

  const activeThemeId = siteInfoResponse?.data?.activeThemeId;
  const isActive = theme?.id === activeThemeId;
  const isBuiltIn = theme ? isSystemDefaultTheme(theme) : false;
  const themeCopy = theme ? resolveThemeDisplayCopy(theme) : null;
  const settings = theme ? parseThemeSettings(theme.settings) : null;

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(
        'POST',
        appendSiteIdToUrl(`/api/themes/${id}/activate`, activeSiteId),
      );
    },
    onSuccess: () => {
      toast({ title: 'Theme activated', description: 'Your site now uses this theme.' });
      queryClient.invalidateQueries({ queryKey: ['/api/themes'] });
      queryClient.invalidateQueries({ queryKey: [`/api/themes/${themeId}`] });
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

  const handleSaved = (): void => {
    queryClient.invalidateQueries({ queryKey: ['/api/themes'] });
    queryClient.invalidateQueries({ queryKey: [`/api/themes/${themeId}`] });
    queryClient.invalidateQueries({ queryKey: ['/api/public/site-theme'] });
  };

  const handleExport = (): void => {
    if (!themeCopy || !settings) return;
    downloadThemeExportFile(
      buildThemeExportDocument({
        name: themeCopy.name,
        description: themeCopy.description,
        settings,
      }),
    );
  };

  const handleImportComplete = (): void => {
    queryClient.invalidateQueries({ queryKey: ['/api/themes'] });
    queryClient.invalidateQueries({ queryKey: [`/api/themes/${themeId}`] });
    queryClient.invalidateQueries({ queryKey: ['/api/public/site-theme'] });
  };

  if (!themeId) {
    return (
      <AdminLayout title="Theme">
        <p className="text-npb-text-secondary">Choose a theme from the list.</p>
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout title="Theme">
        <div role="status" className="py-16 text-center text-npb-text-muted">
          Loading theme…
        </div>
      </AdminLayout>
    );
  }

  if (isError || !theme || !themeCopy || !settings) {
    return (
      <AdminLayout
        title="Theme not found"
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/themes">Back to themes</Link>
          </Button>
        }
      >
        <p className="text-npb-text-secondary">This theme could not be loaded.</p>
      </AdminLayout>
    );
  }

  if (isBuiltIn) {
    return (
      <AdminLayout
        title={themeCopy.name}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/admin/themes">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Themes
              </Link>
            </Button>
            <Button type="button" variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(true)}>
              <Copy className="mr-2 h-4 w-4" />
              Create your own copy
            </Button>
            {!isActive ? (
              <Button
                type="button"
                className="npb-btn-accent"
                disabled={activateMutation.isPending}
                onClick={() => activateMutation.mutate(theme.id)}
              >
                Use on this site
              </Button>
            ) : null}
          </>
        }
      >
        <p className="mb-6 max-w-2xl text-sm text-npb-text-secondary">
          This built-in theme sets the starting colors and fonts for new pages. Copy it to customize,
          or change any page later in the editor.
        </p>

        <div className="grid max-w-3xl gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="admin-surface rounded-lg border border-npb-border-default p-5">
            <p className="text-sm text-npb-text-secondary">{themeCopy.description}</p>
            {isActive ? (
              <Badge className="mt-4 bg-npb-status-success/15 text-npb-status-success">
                <CheckCircle className="mr-1 h-3 w-3" />
                Active on this site
              </Badge>
            ) : null}
          </div>
          <ThemePreviewMockup settings={settings} />
        </div>

        <CreateThemeDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          initialName={`${themeCopy.name} copy`}
          initialDescription={themeCopy.description}
          initialSettings={settings}
          title="Create your own copy"
          submitLabel="Create copy"
          onCreated={(created) => {
            queryClient.invalidateQueries({ queryKey: ['/api/themes'] });
            setLocation(themeEditorPath(created.id));
          }}
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={themeCopy.name}
      actions={
        <>
          <Button variant="outline" asChild>
            <Link href="/admin/themes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Themes
            </Link>
          </Button>
          {!isActive ? (
            <Button
              type="button"
              variant="outline"
              disabled={activateMutation.isPending}
              onClick={() => activateMutation.mutate(theme.id)}
            >
              Use on this site
            </Button>
          ) : (
            <Badge className="bg-npb-status-success/15 text-npb-status-success">
              <CheckCircle className="mr-1 h-3 w-3" />
              Active
            </Badge>
          )}
          <Button type="button" variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button type="button" variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import design
          </Button>
          <Button type="submit" form={THEME_EDIT_FORM_ID} className="npb-btn-accent">
            Save theme
          </Button>
        </>
      }
    >
      <ThemeDesignEditor
        key={`${theme.id}-${theme.updatedAt ?? ''}`}
        formId={THEME_EDIT_FORM_ID}
        themeId={theme.id}
        siteId={activeSiteId}
        name={themeCopy.name}
        description={themeCopy.description}
        settings={settings}
        layout="page"
        onSaved={handleSaved}
      />

      <ThemeImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        mode="replace"
        themeId={theme.id}
        siteId={activeSiteId}
        onImported={() => handleImportComplete()}
      />
    </AdminLayout>
  );
}
