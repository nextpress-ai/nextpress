import { useState, type JSX } from 'react';
import { Inbox, Trash2 } from 'lucide-react';
import type { FormSubmission } from '@shared/schema-types';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { readSubmittedFields } from '@/lib/form-submissions/use-form-submissions';
import { formatSent } from './SubmissionsTable';

type SubmissionDialogProps = {
  item: FormSubmission | null;
  pageTitle?: string;
  onClose: () => void;
  onMarkNew: (item: FormSubmission) => void;
  onDelete: (item: FormSubmission) => Promise<void>;
};

/** Everything one visitor sent, answer by answer, with delete and "mark as new". */
export function SubmissionDialog({ item, pageTitle, onClose, onMarkNew, onDelete }: SubmissionDialogProps): JSX.Element {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fields = item ? readSubmittedFields(item) : [];

  return (
    <>
      <Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="flex max-h-[85vh] max-w-lg flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Inbox className="h-5 w-5" aria-hidden />
              {item?.formName ?? 'Submission'}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <p className="pb-4 text-sm text-npb-text-muted">
              Sent {item ? formatSent(item.createdAt) : ''}
              {pageTitle ? ` from ${pageTitle}` : ''}
            </p>
            <dl className="divide-y divide-npb-divider">
              {fields.map((field) => (
                <div key={field.name} className="grid gap-1 py-3">
                  <dt className="text-sm font-medium text-npb-text-secondary">{field.label}</dt>
                  <dd className="whitespace-pre-wrap break-words text-npb-text-primary">{field.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="ghost" className="text-npb-status-error" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" aria-hidden />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => item && onMarkNew(item)}>
                Mark as new
              </Button>
              <Button type="button" onClick={onClose}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this submission?</AlertDialogTitle>
            <AlertDialogDescription>It is removed for good and leaves the CSV export too.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={async (event) => {
                event.preventDefault();
                if (!item) return;
                setIsDeleting(true);
                await onDelete(item);
                setIsDeleting(false);
                setConfirmOpen(false);
              }}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
