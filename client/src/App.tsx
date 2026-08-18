import { lazy, Suspense } from 'react';
import { Switch, Route, useLocation } from 'wouter';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { AppLoadingShell } from '@/components/app-loading-shell';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ActiveSiteProvider } from '@/hooks/useActiveSite';
import PublicPageView from '@/pages/PublicPageView';
import { AdminChrome } from '@/components/admin/admin-shell';
import { GlobalCommandPalette } from '@/components/admin/global-command-palette';

const NotFound = lazy(() => import('@/pages/not-found'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Posts = lazy(() => import('@/pages/Posts'));
const Pages = lazy(() => import('@/pages/Pages'));
const Media = lazy(() => import('@/pages/Media'));
const Comments = lazy(() => import('@/pages/Comments'));
const Themes = lazy(() => import('@/pages/Themes'));
const ThemeEdit = lazy(() => import('@/pages/ThemeEdit'));
const Users = lazy(() => import('@/pages/Users'));
const Settings = lazy(() => import('@/pages/Settings'));
const Sites = lazy(() => import('@/pages/Sites'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const PageBuilderEditor = lazy(() => import('@/pages/PageBuilderEditor'));
const Templates = lazy(() => import('@/pages/Templates'));
const Plugins = lazy(() => import('@/pages/Plugins'));
const ImportWordPress = lazy(() => import('@/pages/ImportWordPress'));
const PreviewPage = lazy(() => import('@/pages/PreviewPage'));
const Setup = lazy(() => import('@/pages/Setup'));

function RouteFallback() {
  return <AppLoadingShell />;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  
  // Check setup status on mount
  const { data: setupStatus, isLoading: isCheckingSetup } = useQuery({
    queryKey: ['setup-status'],
    queryFn: async () => {
      const res = await fetch('/api/setup/status');
      return res.json();
    },
    staleTime: Infinity,
    retry: false,
  });

  // Show loading while checking setup status or auth
  if (isCheckingSetup || isLoading) {
    return <AppLoadingShell />;
  }

  // If not setup, only show setup route
  if (setupStatus && !setupStatus.isSetup) {
    return (
      <Switch>
        <Route path="/setup" component={Setup} />
        <Route>
          {() => {
            window.location.href = '/setup';
            return null;
          }}
        </Route>
      </Switch>
    );
  }

  const routes = (
    <Suspense fallback={<RouteFallback />}>
      <Switch>
        {/* Setup route - redirects to login if already setup */}
        <Route path="/setup" component={Setup} />

        {/* Auth routes - always available */}
        <Route path="/admin/login" component={Login} />
        <Route path="/admin/register" component={Register} />

        {/* Preview routes - available to everyone */}
        <Route
          path="/preview/post/:id"
          component={({ params }: { params: { id: string } }) => (
            <PreviewPage postId={params.id} type="post" />
          )}
        />
        <Route
          path="/preview/page/:id"
          component={({ params }: { params: { id: string } }) => (
            <PreviewPage postId={params.id} type="page" />
          )}
        />
        <Route
          path="/preview/template/:id"
          component={({ params }: { params: { id: string } }) => (
            <PreviewPage templateId={params.id} type="template" />
          )}
        />

        {/* Public routes - published content available to everyone */}
        <Route
          path="/page/:slug"
          component={({ params }: { params: { slug: string } }) => (
            <PublicPageView slug={params.slug} type="page" />
          )}
        />
        <Route
          path="/post/:slug"
          component={({ params }: { params: { slug: string } }) => (
            <PublicPageView slug={params.slug} type="post" />
          )}
        />
        <Route path="/" component={() => <PublicPageView type="homepage" />} />

        {isAuthenticated ? (
          <>
            <Route path="/admin" component={Dashboard} />
            <Route path="/admin/dashboard" component={Dashboard} />
            <Route path="/admin/posts" component={Posts} />
            <Route path="/admin/pages" component={Pages} />
            <Route path="/admin/media" component={Media} />
            <Route path="/admin/comments" component={Comments} />
            <Route
              path="/admin/themes/:id"
              component={({ params }: { params: { id: string } }) => (
                <ThemeEdit key={params.id} />
              )}
            />
            <Route path="/admin/themes" component={Themes} />
            <Route path="/admin/templates" component={Templates} />
            <Route path="/admin/plugins" component={Plugins} />
            <Route path="/admin/import/wordpress" component={ImportWordPress} />
            <Route path="/admin/users" component={Users} />
            <Route path="/admin/sites" component={Sites} />
            <Route path="/admin/settings" component={Settings} />
            <Route
              path="/admin/page-builder/template/:id"
              component={({ params }: { params: { id: string } }) => (
                <PageBuilderEditor postId={params.id} type="template" />
              )}
            />
            <Route
              path="/admin/page-builder/:type/:id"
              component={({ params }: { params: { type: string; id: string } }) => {
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);
                return (
                  <PageBuilderEditor
                    postId={params.id}
                    type={params.type as 'post' | 'page'}
                    isSlug={params.type === 'page' && !isUUID}
                  />
                );
              }}
            />
            <Route path="/admin/page-builder" component={() => <PageBuilderEditor />} />
          </>
        ) : (
          <Route path="/admin" component={Login} />
        )}

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );

  const isAdminContentRoute =
    isAuthenticated &&
    location.startsWith('/admin') &&
    !location.startsWith('/admin/login') &&
    !location.startsWith('/admin/register') &&
    !location.startsWith('/admin/page-builder');
  const routedContent = isAdminContentRoute ? <AdminChrome>{routes}</AdminChrome> : routes;

  return isAuthenticated ? (
    <ActiveSiteProvider>
      <GlobalCommandPalette />
      {routedContent}
    </ActiveSiteProvider>
  ) : (
    routes
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <SonnerToaster />
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
