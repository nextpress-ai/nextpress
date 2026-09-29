import { useState, type JSX } from 'react';
import { ClipboardPaste } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { PasteAllMode } from '@shared/page-transfer';

type PasteBlocksDialogProps = {
  open: boolean;
  blockCount: number;
  isPasting: boolean;
  onCancel: () => void;
  onPaste: (mode: PasteAllMode) => void;
};

const CHOICES: { value: PasteAllMode; title: string; hint: string }[] = [
  { value: 'append', title: 'Add at the end', hint: 'Keeps this page and its look. The copied blocks go after it.' },
  { value: 'replace', title: 'Replace this page', hint: 'The copied page, with its look, takes over. Undo brings this one back.' },
];

/** Asks where copied blocks go when a page that already has content receives them. */
export function PasteBlocksDialog({ open, blockCount, isPasting, onCancel, onPaste }: PasteBlocksDialogProps): JSX.Element {
  const [mode, setMode] = useState<PasteAllMode>('append');

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isPasting && onCancel()}>
      <DialogContent className="max-w-md" showCloseButton={!isPasting}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ClipboardPaste className="h-5 w-5" aria-hidden />
            Paste {blockCount} {blockCount === 1 ? 'block' : 'blocks'}
          </DialogTitle>
        </DialogHeader>
        <RadioGroup
          value={mode}
          onValueChange={(value) => setMode(value as PasteAllMode)}
          className="grid gap-2"
          aria-label="Where the copied blocks go"
        >
          {CHOICES.map((choice) => (
            <Label
              key={choice.value}
              htmlFor={`paste-mode-${choice.value}`}
              className="flex cursor-pointer items-start gap-3 rounded-[var(--npb-radius-surface)] border border-npb-border-default p-3 font-normal transition-colors hover:bg-npb-surface-inset has-[[data-state=checked]]:border-npb-accent"
            >
              <RadioGroupItem id={`paste-mode-${choice.value}`} value={choice.value} className="mt-0.5" disabled={isPasting} />
              <span className="grid gap-1">
                <span className="font-medium text-npb-text-primary">{choice.title}</span>
                <span className="text-xs text-npb-text-muted">{choice.hint}</span>
              </span>
            </Label>
          ))}
        </RadioGroup>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPasting}>
            Cancel
          </Button>
          <Button type="button" onClick={() => onPaste(mode)} disabled={isPasting}>
            {isPasting ? 'Pasting…' : mode === 'replace' ? 'Replace page' : 'Add blocks'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
