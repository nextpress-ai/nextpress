import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import type { IconReference } from '@/lib/icon-indexes';
import { cn } from '@/lib/utils';
import { IconPickerDialog } from './IconPickerDialog';

interface IconPickerButtonProps {
  currentIcon?: IconReference;
  onSelect: (icon: IconReference) => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'icon';
  /** Merged onto trigger button (e.g. `shrink-0` beside truncated label). */
  className?: string;
}

export function IconPickerButton({
  currentIcon,
  onSelect,
  variant = 'outline',
  size = 'sm',
  className,
}: IconPickerButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={cn('gap-1', className)}
      >
        <Pencil className="w-3 h-3" />
        Change
      </Button>
      <IconPickerDialog
        open={open}
        onOpenChange={setOpen}
        onSelect={onSelect}
        currentIcon={currentIcon}
      />
    </>
  );
}
