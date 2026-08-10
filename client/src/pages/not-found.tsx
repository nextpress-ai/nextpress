import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, Home } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';

/**
 * 404 Not Found — back or home; home route depends on auth.
 */
export default function NotFound() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  const homeRoute = isAuthenticated ? '/admin/dashboard' : '/';

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation(homeRoute);
    }
  };

  const handleGoHome = () => {
    setLocation(homeRoute);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-npb-canvas-bg">
      <Card className="admin-surface mx-4 w-full max-w-md">
        <CardTitle className="w-full justify-center p-2 text-center">
          <h1 className="text-2xl font-bold text-npb-text-primary md:text-4xl">
            NextPress
          </h1>
        </CardTitle>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center justify-center gap-2">
            <AlertCircle className="h-8 w-8 text-npb-status-error" />
            <h1 className="text-2xl font-bold text-npb-text-primary">
              404 Page Not Found
            </h1>
          </div>

          <p className="mb-6 mt-4 text-center text-sm text-npb-text-secondary">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>

          <div className="flex gap-3">
            <Button onClick={handleGoBack} variant="outline" className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
            <Button
              onClick={handleGoHome}
              className="flex-1 npb-btn-accent"
            >
              <Home className="mr-2 h-4 w-4" />
              Go to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
