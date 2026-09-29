import { useRef, useState, type JSX } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { CheckCircle2, FileUp, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { countPageBlocks, readPagePackage, type PagePackage } from '@shared/page-transfer';
import {
  describeMissingFiles,
  importPageFile,
  type PageImportResult,
} from '@/lib/page-transfer/page-transfer-api';
import { pageEditorPath } from '@/lib/admin-content-routes';
import { showErrorToast } from '@/lib/sonner-toast';

type ImportPageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId?: string;
};

type Chosen = { file: File; pkg: PagePackage };

/** FileReader works in every browser the admin supports, including older Safari. */
const readFileText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'));
    reader.readAsText(file);
  });

const formatSize = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

function ChosenSummary({ chosen }: { chosen: Chosen }): JSX.Element {
  const { pkg, file } = chosen;
  const carried = pkg.files.filter((item) => item.data).length;
  const placeholders = pkg.files.length - carried;
  const rows: [string, string][] = [
    ['Page', pkg.page?.title ?? 'Untitled'],
    ['Blocks', String(countPageBlocks(pkg.blocks))],
    [
      'Files',
      placeholders > 0 ? `${carried} included, ${placeholders} as placeholders` : `${carried} included`,
    ],
    ['File size', formatSize(file.size)],
  ];
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-npb-text-muted">{label}</dt>
          <dd className="truncate font-medium text-npb-text-primary">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ImportedSummary({ result }: { result: PageImportResult }): JSX.Element {
  const missing = describeMissingFiles(result.files.missing);
  const themeLine =
    result.theme.status === 'added'
      ? `Theme "${result.theme.name}" was added. Switch to it in Appearance if you want the same look.`
      : result.theme.status === 'reused'
        ? `Theme "${result.theme.name}" was already here.`
        : null;
  return (
    <div className="grid gap-3 text-sm">
      <p className="flex items-center gap-2 font-medium text-npb-text-primary">
        <CheckCircle2 className="h-4 w-4 text-npb-status-success" aria-hidden />
        "{result.page.title}" is ready as a draft.
      </p>
      <p className="text-npb-text-secondary">
        {result.files.added.length} files added, {result.files.reused.length} already on this site.
      </p>
      {missing ? <p className="text-npb-status-warning">{missing}</p> : null}
      {themeLine ? <p className="text-npb-text-secondary">{themeLine}</p> : null}
    </div>
  );
}

/**
 * Brings a page file from another NextPress site in as a draft: blocks, files and (if chosen)
 * the theme it was made with. Nothing is published and the active theme never changes.
 */
export function ImportPageDialog({ open, onOpenChange, siteId }: ImportPageDialogProps): JSX.Element {
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const [includeTheme, setIncludeTheme] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<PageImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const reset = (): void => {
    setChosen(null);
    setResult(null);
    setIncludeTheme(true);
  };

  const close = (next: boolean): void => {
    if (isImporting) return;
    onOpenChange(next);
    if (!next) reset();
  };

  const choose = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    const text = await readFileText(file).catch((error: Error) => {
      console.error('[page-transfer] Could not read the chosen file', { atFunction: 'ImportPageDialog.choose', name: file.name, error });
      return null;
    });
    if (text === null) {
      showErrorToast("This file couldn't be opened. Try choosing it again.");
      return;
    }
    const read = readPagePackage(text);
    if (!read.ok) {
      showErrorToast(read.message);
      return;
    }
    if (!read.value.page) {
      showErrorToast('These are copied blocks, not a page file. Paste them in the editor instead.');
      return;
    }
    setChosen({ file, pkg: read.value });
  };

  const runImport = async (): Promise<void> => {
    if (!chosen) return;
    setIsImporting(true);
    await importPageFile({ file: chosen.file, includeTheme, siteId })
      .then((imported) => {
        setResult(imported);
        void queryClient.invalidateQueries({ queryKey: ['/api/pages'] });
      })
      .catch((error: Error) => {
        console.error('[page-transfer] Import failed', { atFunction: 'ImportPageDialog', siteId, error });
        showErrorToast(error.message);
      });
    setIsImporting(false);
  };

  const themeName = chosen?.pkg.theme?.name;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md" showCloseButton={!isImporting}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileUp className="h-5 w-5" aria-hidden />
            Import page
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {result ? (
            <ImportedSummary result={result} />
          ) : (
            <div className="divide-y divide-npb-divider">
              <div className="pb-4">
                <input
                  ref={inputRef}
                  type="file"
                  accept=".json,application/json"
                  className="sr-only"
                  aria-label="Page file"
                  onChange={(event) => void choose(event.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    void choose(event.dataTransfer.files[0]);
                  }}
                  disabled={isImporting}
                  className="flex w-full flex-col items-center gap-2 rounded-[var(--npb-radius-surface)] border border-dashed border-npb-border-strong bg-npb-surface-inset px-4 py-6 text-sm text-npb-text-secondary transition-colors hover:border-npb-accent hover:text-npb-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-npb-focus"
                >
                  <Upload className="h-5 w-5" aria-hidden />
                  {chosen ? `${chosen.file.name} — choose another` : 'Choose a page file or drop it here'}
                </button>
              </div>
              {chosen ? (
                <div className="grid gap-4 pt-4">
                  <ChosenSummary chosen={chosen} />
                  {themeName ? (
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="import-include-theme"
                        checked={includeTheme}
                        onCheckedChange={(checked) => setIncludeTheme(checked === true)}
                        disabled={isImporting}
                      />
                      <Label htmlFor="import-include-theme" className="grid gap-1 font-normal">
                        <span className="font-medium">Also add theme "{themeName}"</span>
                        <span className="text-xs text-npb-text-muted">
                          Added next to your themes. Your site keeps its current look until you switch.
                        </span>
                      </Label>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <DialogFooter>
          {result ? (
            <>
              <Button type="button" variant="outline" onClick={() => close(false)}>
                Close
              </Button>
              <Button
                type="button"
                onClick={() => {
                  close(false);
                  setLocation(`${pageEditorPath(result.page.id)}?mode=builder`);
                }}
              >
                Open in editor
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => close(false)} disabled={isImporting}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void runImport()}
                disabled={!chosen || isImporting}
                title={!chosen ? 'Choose a page file first' : undefined}
              >
                {isImporting ? 'Importing…' : chosen ? 'Import as draft' : 'Choose a file first'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
