import { cn } from '@/lib/utils';

type SurfaceCardProps = {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md';
  header?: { title: string; actions?: React.ReactNode };
};

export function SurfaceCard({ children, className, interactive, padding = 'md', header }: SurfaceCardProps) {
  const paddingMap = { none: 'p-0', sm: 'p-3', md: 'p-4' };

  return (
    <div className={cn(
      'border border-npb-border-default bg-npb-surface-base',
      'shadow-[var(--npb-shadow-surface)]',
      'rounded-[var(--npb-radius-surface)]',
      interactive && 'transition-colors hover:bg-npb-surface-raised hover:border-npb-border-strong cursor-pointer',
      className
    )}>
      {header && (
        <div className="flex items-center justify-between px-4 py-3 bg-npb-surface-header border-b border-npb-divider">
          <span className="text-sm font-semibold text-npb-text-primary">{header.title}</span>
          {header.actions}
        </div>
      )}
      <div className={paddingMap[padding]}>
        {children}
      </div>
    </div>
  );
}