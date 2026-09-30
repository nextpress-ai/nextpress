import { useState, type JSX } from 'react';
import { Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { downloadPageFile } from '@/lib/page-transfer/page-transfer-api';
import { showErrorToast, showSuccessToast } from '@/lib/sonner-toast';
import { LinkedPagesPicker } from './LinkedPagesPicker';
import { useLinkedPageChoice } from './use-linked-page-choice';

type ExportPageDialogProps = {
  page: { id: string; title: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Downloads a page as one file that another NextPress site can import without edits.
 * The switch keeps the file small by leaving images, videos and other files out.
 */
export function ExportPageDialog({ page, open, onOpenChange }: ExportPageDialogProps): JSX.Element {
  const [includeFiles, setIncludeFiles] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const choice = useLinkedPageChoice({ pageId: page?.id, enabled: open });

  const exportPage = async (): Promise<void> => {
    if (!page) return;
    setIsExporting(true);
    const pageCount = 1 + choice.chosenIds.length;
    await downloadPageFile({ pageId: page.id, includeFiles, includePageIds: choice.chosenIds })
      .then(() => {
        showSuccessToast(pageCount === 1 ? 'Page file downloaded' : `Page file with ${pageCount} pages downloaded`);
        choice.reset();
        onOpenChange(false);
      })
      .catch((error: Error) => {
        console.error('[page-transfer] Export failed', { atFunction: 'ExportPageDialog', pageId: page.id, error });
        showErrorToast(error.message);
      });
    setIsExporting(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isExporting) return;
        if (!next) choice.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[85vh] max-w-md flex-col" showCloseButton={!isExporting}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Download className="h-5 w-5" aria-hidden />
            Export page
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 divide-y divide-npb-divider overflow-y-auto">
          <p className="pb-4 text-sm text-npb-text-secondary">
            <span className="font-medium text-npb-text-primary">{page?.title || 'Untitled'}</span> is saved as one
            file with its blocks and site theme. Import it on any NextPress site from Pages.
          </p>
          <div className="flex items-start justify-between gap-4 pt-4">
            <div className="grid gap-1">
              <Label htmlFor="export-include-files">Include images, videos and other files</Label>
              <p id="export-include-files-hint" className="text-xs text-npb-text-muted">
                {includeFiles
                  ? 'The page arrives complete. Larger file.'
                  : 'Small file. Each file becomes a named placeholder to swap later.'}
              </p>
            </div>
            <Switch
              id="export-include-files"
              checked={includeFiles}
              onCheckedChange={setIncludeFiles}
              disabled={isExporting}
              aria-describedby="export-include-files-hint"
            />
          </div>
          <div className="pt-4">
            <LinkedPagesPicker choice={choice} disabled={isExporting} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void exportPage()} disabled={!page || isExporting}>
            {isExporting
              ? 'Preparing file…'
              : choice.chosenIds.length > 0
                ? `Download ${1 + choice.chosenIds.length} pages`
                : 'Download file'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
