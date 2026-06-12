import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ThemeColorPreview } from '@/components/themes/theme-color-preview';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Theme } from '@shared/schema-types';

const rendererBadgeClass = (renderer: string | undefined | null): string => {
  const map: Record<string, string> = {
    nextjs: 'bg-npb-text-primary text-npb-text-inverse',
    react: 'bg-npb-accent text-white',
    custom: 'bg-npb-surface-inset text-npb-text-primary border border-npb-border-default',
  };
  return map[renderer ?? ''] ?? 'bg-npb-surface-inset text-npb-text-secondary';
};

export default function Themes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: themes, isLoading } = useQuery({
    queryKey: ['/api/themes'],
  });

  const { data: activeTheme } = useQuery({
    queryKey: ['/api/themes/active'],
  });

  const activateMutation = useMutation({
    mutationFn: async (themeId: string) => {
      return await apiRequest('POST', `/api/themes/${themeId}/activate`);
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Theme activated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/themes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/themes/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/site'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to activate theme',
        variant: 'destructive',
      });
    },
  });

  const active = activeTheme as Theme | undefined;
  const themeList = (themes as Theme[] | undefined) ?? [];

  return (
    <AdminLayout title="Themes">
      {active ? (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-npb-text-primary">Current Theme</h2>
          <Card className="admin-surface overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <ThemeColorPreview
                  settings={active.settings as { colors?: Record<string, string> }}
                  className="h-32 w-full shrink-0 sm:w-48"
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold text-npb-text-primary">{active.name}</h3>
                    <Badge className={rendererBadgeClass(active.renderer)}>
                      {(active.renderer ?? 'ssr').toUpperCase()}
                    </Badge>
                    <Badge className="bg-npb-status-success/15 text-npb-status-success">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Active
                    </Badge>
                  </div>
                  <p className="mb-4 text-npb-text-secondary">{active.description}</p>
                  <div className="text-sm text-npb-text-muted">
                    <div>Version: {active.version}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : (
        <section className="mb-8">
          <Card className="admin-surface">
            <CardContent className="py-8 text-center text-npb-text-muted">
              No active theme. Activate one from the list below.
            </CardContent>
          </Card>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold text-npb-text-primary">Available Themes</h2>
        {isLoading ? (
          <div className="py-8 text-center text-npb-text-muted">Loading themes…</div>
        ) : themeList.length === 0 ? (
          <div className="py-8 text-center text-npb-text-muted">
            No themes installed. Restart the server to seed the default theme.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {themeList
              .filter((theme) => active?.id !== theme.id)
              .map((theme) => (
                <Card
                  key={theme.id}
                  className="admin-surface transition-colors hover:bg-npb-surface-inset"
                >
                  <CardContent className="space-y-4 p-6">
                    <ThemeColorPreview
                      settings={theme.settings as { colors?: Record<string, string> }}
                    />
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-npb-text-primary">{theme.name}</h3>
                        {theme.renderer ? (
                          <Badge className={rendererBadgeClass(theme.renderer)}>
                            {theme.renderer.toUpperCase()}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mb-3 line-clamp-2 text-sm text-npb-text-secondary">
                        {theme.description}
                      </p>
                      <div className="mb-4 text-xs text-npb-text-muted">
                        <div>Version: {theme.version}</div>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-npb-accent hover:bg-npb-accent-hover text-white"
                      onClick={() => activateMutation.mutate(theme.id)}
                      disabled={activateMutation.isPending}
                    >
                      Activate
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
