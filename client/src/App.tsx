import { lazy, Suspense } from 'react';
import { Switch, Route } from 'wouter';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { AppLoadingShell } from '@/components/app-loading-shell';
import { ThemeProvider } from '@/components/ThemeProvider';
import PublicPageView from '@/pages/PublicPageView';

const NotFound = lazy(() => import('@/pages/not-found'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Posts = lazy(() => import('@/pages/Posts'));
const Pages = lazy(() => import('@/pages/Pages'));
const Media = lazy(() => import('@/pages/Media'));
const Comments = lazy(() => import('@/pages/Comments'));
const Themes = lazy(() => import('@/pages/Themes'));
const Users = lazy(() => import('@/pages/Users'));
const Settings = lazy(() => import('@/pages/Settings'));
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

  // Show loading while checking setup status
  if (isCheckingSetup) {
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

  return (
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
        component={({ params }: any) => (
          <PreviewPage postId={params.id} type="post" />
        )}
      />
      <Route
        path="/preview/page/:id"
        component={({ params }: any) => (
          <PreviewPage postId={params.id} type="page" />
        )}
      />
      <Route
        path="/preview/template/:id"
        component={({ params }: any) => (
          <PreviewPage templateId={params.id} type="template" />
        )}
      />

      {/* Public routes - published content available to everyone */}
      <Route
        path="/page/:slug"
        component={({ params }: any) => (
          <PublicPageView slug={params.slug} type="page" />
        )}
      />
      <Route
        path="/post/:slug"
        component={({ params }: any) => (
          <PublicPageView slug={params.slug} type="post" />
        )}
      />
      <Route path="/" component={() => <PublicPageView type="homepage" />} />

      {/* Conditional routes based on auth state */}
      {isLoading ? (
        <AppLoadingShell />
      ) : !isAuthenticated ? (
        <>
          <Route path="/admin" component={Login} />
          <Route component={NotFound} />
        </>
      ) : (
        <>
          <Route path="/admin" component={Dashboard} />
          <Route path="/admin/dashboard" component={Dashboard} />
          <Route path="/admin/posts" component={Posts} />
          <Route path="/admin/pages" component={Pages} />
          <Route path="/admin/media" component={Media} />
          <Route path="/admin/comments" component={Comments} />
          <Route path="/admin/themes" component={Themes} />
          <Route path="/admin/templates" component={Templates} />
          <Route path="/admin/plugins" component={Plugins} />
          <Route path="/admin/import/wordpress" component={ImportWordPress} />
          <Route path="/admin/users" component={Users} />
          <Route path="/admin/settings" component={Settings} />
          <Route
            path="/admin/page-builder/template/:id"
            component={({ params }: any) => (
              <PageBuilderEditor postId={params.id} type="template" />
            )}
          />
          <Route
            path="/admin/page-builder/:type/:id"
            component={({ params }: any) => {
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
          <Route component={NotFound} />
        </>
      )}
    </Switch>
    </Suspense>
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
