import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Download, Settings } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
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
    mutationFn: async (themeId: number) => {
      return await apiRequest('POST', `/api/themes/${themeId}/activate`);
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Theme activated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/themes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/themes/active'] });
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
    <AdminLayout
      title="Themes"
      actions={
        <Button className="bg-npb-accent hover:bg-npb-accent-hover text-white">
          <Download className="mr-2 h-4 w-4" />
          Install Theme
        </Button>
      }
    >
      {active ? (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-npb-text-primary">Current Theme</h2>
          <Card className="admin-surface overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <img
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200"
                  alt={active.name}
                  className="h-32 w-full rounded-[var(--npb-radius-surface)] object-cover sm:w-48"
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold text-npb-text-primary">{active.name}</h3>
                    <Badge className={rendererBadgeClass(active.renderer)}>
                      {(active.renderer ?? 'unknown').toUpperCase()}
                    </Badge>
                    <Badge className="bg-npb-status-success/15 text-npb-status-success">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Active
                    </Badge>
                  </div>
                  <p className="mb-4 text-npb-text-secondary">{active.description}</p>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="text-sm text-npb-text-muted">
                      <div>Version: {active.version}</div>
                      <div>By: {active.authorId}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Settings className="mr-2 h-4 w-4" />
                        Customize
                      </Button>
                      <Button
                        size="sm"
                        className="bg-npb-accent hover:bg-npb-accent-hover text-white"
                      >
                        Live Preview
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section>
        <h2 className="mb-4 text-lg font-semibold text-npb-text-primary">Available Themes</h2>
        {isLoading ? (
          <div className="py-8 text-center text-npb-text-muted">Loading themes…</div>
        ) : themeList.length === 0 ? (
          <div className="py-8 text-center text-npb-text-muted">
            No themes available. Install a theme to get started.
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
                    <img
                      src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250"
                      alt={theme.name}
                      className="h-32 w-full rounded-[var(--npb-radius-surface)] object-cover"
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
                        <div>By: {theme.authorId}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-npb-accent hover:bg-npb-accent-hover text-white"
                        onClick={() =>
                          activateMutation.mutate(theme.id as unknown as number)
                        }
                        disabled={activateMutation.isPending}
                      >
                        Activate
                      </Button>
                      <Button variant="outline" className="flex-1">
                        Preview
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
