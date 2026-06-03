import { cn } from '@/lib/utils';

type OptionButtonProps = {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel: string;
};

export function OptionButton({ isActive, onClick, children, ariaLabel }: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        'h-9 px-3 text-sm font-semibold rounded-[var(--npb-radius-input)] transition-all',
        'transition-transform duration-[var(--npb-duration-fast)] ease-[var(--npb-ease-out)]',
        'active:scale-[0.97]',
        isActive
          ? 'bg-npb-interactive-bg-active text-npb-interactive-text-active'
          : 'bg-npb-interactive-bg text-npb-interactive-text border border-npb-border-default hover:bg-npb-interactive-bg-hover'
      )}
    >
      {children}
    </button>
  );
}