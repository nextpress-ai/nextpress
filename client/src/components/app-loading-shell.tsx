import { Spinner } from '@/components/ui/spinner';

type AppLoadingShellProps = {
  /** Optional status line under the spinner. */
  label?: string;
  /** When true, fills at least the viewport height. */
  fullScreen?: boolean;
  className?: string;
};

/**
 * Theme-aware loading shell — uses `npb-*` canvas tokens so fallbacks match
 * admin/public chrome instead of hardcoded gray backgrounds.
 */
export function AppLoadingShell({
  label,
  fullScreen = true,
  className = '',
}: AppLoadingShellProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center bg-npb-canvas-bg',
        fullScreen ? 'min-h-screen' : 'h-full w-full',
        className,
      ]
        .filter(Boolean)
        .join(' ')}>
      <Spinner className="h-12 w-12 text-npb-accent" />
      {label ? (
        <p className="mt-4 text-sm text-npb-text-muted">{label}</p>
      ) : null}
    </div>
  );
}
