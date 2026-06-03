import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type SettingsLabelProps = {
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
  /** Extra classes merged onto the inner label (e.g. `text-xs`). */
  className?: string;
};

export function SettingsLabel({ htmlFor, children, hint, className }: SettingsLabelProps) {
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor={htmlFor} className={cn('text-sm font-medium text-npb-text-secondary', className)}>
        {children}
      </Label>
      {hint && <span className="text-xs text-npb-text-muted">{hint}</span>}
    </div>
  );
}