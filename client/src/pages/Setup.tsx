import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Checkbox } from '@/components/ui/checkbox';
import { DomainInputWithVerify } from '@/components/domain';
import { BrandedFormLayout } from '@/components/auth';
import { cn } from '@/lib/utils';

const PASSWORD_REQUIREMENTS = [
  { regex: /.{8,}/, label: 'At least 8 characters' },
  { regex: /[A-Z]/, label: 'One uppercase letter' },
  { regex: /[a-z]/, label: 'One lowercase letter' },
  { regex: /[0-9]/, label: 'One number' },
];

/** Time to allow routing and certificates to settle before opening a public site domain. */
const POST_SETUP_REDIRECT_MS = 8000;

const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/i;

/** Whether the domain value targets this machine (localhost, loopback, or raw IP). */
const isLocalHostDomain = (value: string): boolean => {
  const raw = value.trim().replace(/^https?:\/\//, '').split('/')[0];
  return LOCAL_HOST_PATTERN.test(raw);
};

const buildLocalHostDomain = (): string => {
  if (typeof window === 'undefined') return 'localhost:5000';
  return window.location.host || 'localhost:5000';
};

/**
 * Builds `/admin/login` on the configured site host so the browser does not stay on a raw address.
 */
function buildLoginUrlFromDomain(domain: string): string {
  const raw = domain.trim();
  if (!raw || isLocalHostDomain(raw)) {
    return `${window.location.origin}/admin/login`;
  }
  try {
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      const base = new URL(raw);
      return `${base.origin}/admin/login`;
    }
    return `https://${raw.replace(/\/+$/, '')}/admin/login`;
  } catch {
    return `${window.location.origin}/admin/login`;
  }
}

/**
 * Setup Wizard page for initial system configuration.
 * Displayed when the system has no sites configured (fresh install).
 */
export default function Setup() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [useLocalDomain, setUseLocalDomain] = useState(false);
  const [finishingSetup, setFinishingSetup] = useState<{
    loginUrl: string;
    httpsNote: boolean;
  } | null>(null);
  const [formData, setFormData] = useState({
    siteName: '',
    domain: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    try {
      const host = buildLocalHostDomain();
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        setUseLocalDomain(true);
        setFormData((prev) => ({ ...prev, domain: host }));
      } else if (hostname) {
        setFormData((prev) => ({ ...prev, domain: hostname }));
      }
    } catch {
      // ignore
    }

    const checkSetupStatus = async () => {
      try {
        const res = await fetch('/api/setup/status');
        const data = await res.json();
        if (data.isSetup) {
          setLocation('/admin/login');
        }
      } catch {
        // If check fails, show the form anyway
      } finally {
        setIsCheckingStatus(false);
      }
    };
    void checkSetupStatus();
  }, [setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const failedRequirements = PASSWORD_REQUIREMENTS.filter(
      (req) => !req.regex.test(formData.password),
    );
    if (failedRequirements.length > 0) {
      setError(
        `Please meet these password rules: ${failedRequirements.map((r) => r.label).join(', ')}`,
      );
      return;
    }

    setIsLoading(true);

    let scheduledRedirect = false;

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteName: formData.siteName,
          domain: formData.domain,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = (await res.json()) as {
        message?: string;
        error?: string;
        loginUrl?: string;
        caddySuccess?: boolean;
      };

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Setup failed');
      }

      const loginUrl =
        typeof data.loginUrl === 'string' && data.loginUrl.length > 0
          ? data.loginUrl
          : buildLoginUrlFromDomain(formData.domain);

      const redirectLocal =
        useLocalDomain || isLocalHostDomain(formData.domain);

      if (redirectLocal) {
        setLocation('/admin/login');
        return;
      }

      scheduledRedirect = true;
      setIsLoading(false);
      setFinishingSetup({
        loginUrl,
        httpsNote: data.caddySuccess === false,
      });
      setTimeout(() => {
        window.location.assign(loginUrl);
      }, POST_SETUP_REDIRECT_MS);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Setup failed';
      setError(message);
    } finally {
      if (!scheduledRedirect) {
        setIsLoading(false);
      }
    }
  };

  const updateField =
    (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const getPasswordStrength = () =>
    PASSWORD_REQUIREMENTS.filter((req) => req.regex.test(formData.password)).length;

  if (isCheckingStatus) {
    return (
      <BrandedFormLayout>
        <div className="flex min-h-[12rem] w-full flex-col items-center justify-center gap-4 rounded-xl border border-border/60 bg-card/80 px-6 py-12 shadow-md">
          <Spinner className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">One moment…</p>
        </div>
      </BrandedFormLayout>
    );
  }

  if (finishingSetup) {
    return (
      <BrandedFormLayout>
        <Card className="w-full border-border/70 bg-card/95 shadow-lg shadow-black/[0.04] backdrop-blur-sm supports-[backdrop-filter]:bg-card/90 dark:shadow-black/25">
          <CardHeader className="space-y-2 pb-2 text-center">
            <CardTitle className="text-xl font-semibold tracking-tight">
              Applying your domain
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Waiting a few seconds so your site address can finish updating. Sign in opens next.
            </CardDescription>
            {finishingSetup.httpsNote ? (
              <p className="text-center text-xs text-amber-800 dark:text-amber-200">
                Secure access may need another minute. If the page does not load, try again shortly.
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pb-8 pt-2">
            <Spinner className="h-8 w-8 text-muted-foreground" />
            <p className="break-all text-center text-xs text-muted-foreground">
              {finishingSetup.loginUrl}
            </p>
          </CardContent>
        </Card>
      </BrandedFormLayout>
    );
  }

  return (
    <BrandedFormLayout>
      <Card className="w-full border-border/70 bg-card/95 shadow-lg shadow-black/[0.04] backdrop-blur-sm supports-[backdrop-filter]:bg-card/90 dark:shadow-black/25">
        <CardHeader className="space-y-1 pb-2 text-center">
          <CardTitle className="text-xl font-semibold tracking-tight">
            Welcome
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Name your site and create your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="siteName">Site name</Label>
              <Input
                id="siteName"
                placeholder="My site"
                value={formData.siteName}
                onChange={updateField('siteName')}
                required
                disabled={isLoading}
                className="h-10"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                <Checkbox
                  id="useLocalDomain"
                  checked={useLocalDomain}
                  onCheckedChange={(checked) => {
                    const enabled = checked === true;
                    setUseLocalDomain(enabled);
                    setFormData((prev) => ({
                      ...prev,
                      domain: enabled ? buildLocalHostDomain() : '',
                    }));
                  }}
                  disabled={isLoading}
                />
                <div className="space-y-1">
                  <Label htmlFor="useLocalDomain" className="cursor-pointer font-medium">
                    Use local
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Run on this machine only — no DNS or HTTPS setup required.
                  </p>
                </div>
              </div>

              {useLocalDomain ? (
                <div className="space-y-2">
                  <Label htmlFor="domain">Local address</Label>
                  <Input
                    id="domain"
                    value={formData.domain}
                    readOnly
                    disabled
                    className="h-10 bg-muted"
                  />
                </div>
              ) : (
                <DomainInputWithVerify
                  id="domain"
                  label="Domain"
                  inputMode="domain"
                  value={formData.domain}
                  onChange={(v) => {
                    setFormData((prev) => ({ ...prev, domain: v }));
                  }}
                  placeholder="example.com"
                  disabled={isLoading}
                  required
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Admin email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={formData.email}
                onChange={updateField('email')}
                autoComplete="email"
                required
                disabled={isLoading}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={updateField('password')}
                  autoComplete="new-password"
                  required
                  disabled={isLoading}
                  className="h-10 pr-10"
                  placeholder="••••••••"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0.5 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </Button>
              </div>
              {formData.password ? (
                <div className="space-y-2 pt-0.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-colors',
                          i <= getPasswordStrength()
                            ? getPasswordStrength() >= 4
                              ? 'bg-emerald-500'
                              : getPasswordStrength() >= 2
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            : 'bg-muted',
                        )}
                      />
                    ))}
                  </div>
                  <ul className="space-y-0.5 text-xs text-muted-foreground">
                    {PASSWORD_REQUIREMENTS.map((req) => (
                      <li
                        key={req.label}
                        className={cn(
                          req.regex.test(formData.password) && 'font-medium text-emerald-700 dark:text-emerald-400',
                        )}
                      >
                        {req.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={updateField('confirmPassword')}
                  autoComplete="new-password"
                  required
                  disabled={isLoading}
                  className="h-10 pr-10"
                  placeholder="••••••••"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0.5 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  aria-pressed={showConfirmPassword}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </Button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword ? (
                <p className="text-xs text-destructive">Passwords do not match</p>
              ) : null}
            </div>

            <Button
              type="submit"
              className="h-10 w-full font-medium"
              disabled={isLoading || getPasswordStrength() < 4}
            >
              {isLoading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Setting up…
                </>
              ) : (
                'Complete setup'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </BrandedFormLayout>
  );
}
