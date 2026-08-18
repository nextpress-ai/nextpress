import { useRef, useState, type ChangeEvent, type JSX } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { apiRequest } from '@/lib/queryClient';
import { appendSiteIdToUrl } from '@/lib/site-api';
import { readThemeExportFile } from '@/lib/theme-export-file';
import { useToast } from '@/hooks/use-toast';
import { parseThemeImportDocument } from '@shared/theme-export';
import type { Theme } from '@shared/schema-types';

type ThemeImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'replace';
  themeId?: string;
  siteId?: string;
  onImported: (theme: Theme) => void;
};

/**
 * Imports a portable `.nextpress-theme.json` file as a new theme or into the open editor.
 */
export function ThemeImportDialog({
  open,
  onOpenChange,
  mode,
  themeId,
  siteId,
  onImported,
}: ThemeImportDialogProps): JSX.Element {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedName, setParsedName] = useState('');
  const [parsedDescription, setParsedDescription] = useState('');
  const [parsedSettings, setParsedSettings] = useState<ReturnType<
    typeof parseThemeImportDocument
  > | null>(null);
  const [useFileName, setUseFileName] = useState(true);
  const [importing, setImporting] = useState(false);

  const reset = (): void => {
    setFileName(null);
    setParsedName('');
    setParsedDescription('');
    setParsedSettings(null);
    setUseFileName(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = (nextOpen: boolean): void => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    try {
      const text = await readThemeExportFile(file);
      const parsed = parseThemeImportDocument(JSON.parse(text) as unknown);
      if (!parsed.ok) {
        toast({
          title: 'Could not read theme file',
          description: parsed.message,
          variant: 'destructive',
        });
        reset();
        return;
      }

      setParsedSettings(parsed);
      setParsedName(parsed.document.name);
      setParsedDescription(parsed.document.description ?? '');
    } catch {
      toast({
        title: 'Could not read theme file',
        description: 'Choose a valid NextPress theme file.',
        variant: 'destructive',
      });
      reset();
    }
  };

  const handleImport = async (): Promise<void> => {
    if (!parsedSettings?.ok) {
      toast({
        title: 'Choose a theme file',
        description: 'Select a file before importing.',
        variant: 'destructive',
      });
      return;
    }

    const doc = parsedSettings.document;
    const name = mode === 'create' ? doc.name.trim() : useFileName ? doc.name.trim() : undefined;
    const description =
      mode === 'create' || useFileName ? doc.description?.trim() || undefined : undefined;

    if (mode === 'create' && !name) {
      toast({
        title: 'Name required',
        description: 'The theme file needs a name.',
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);
    try {
      if (mode === 'create') {
        const response = await apiRequest('POST', '/api/themes', {
          name,
          description,
          settings: doc.settings,
        });
        const theme = (await response.json()) as Theme;
        toast({
          title: 'Theme imported',
          description: 'Review the settings, then save if you make changes.',
        });
        handleClose(false);
        onImported(theme);
        return;
      }

      if (!themeId) return;

      const response = await apiRequest(
        'PATCH',
        appendSiteIdToUrl(`/api/themes/${themeId}`, siteId),
        {
          ...(useFileName && name ? { name } : {}),
          ...(useFileName && description !== undefined ? { description } : {}),
          settings: doc.settings,
        },
      );
      const theme = (await response.json()) as Theme;
      toast({
        title: 'Design imported',
        description: 'Theme settings were replaced from your file.',
      });
      handleClose(false);
      onImported(theme);
    } catch {
      toast({
        title: 'Import failed',
        description: 'Try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Import theme' : 'Import design'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="theme-import-file">Theme file</Label>
            <Input
              id="theme-import-file"
              ref={fileInputRef}
              type="file"
              accept=".json,.nextpress-theme.json,application/json"
              onChange={(event) => void handleFileChange(event)}
              className="h-9 cursor-pointer file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium"
            />
            {fileName ? (
              <p className="text-xs text-npb-text-muted">Selected: {fileName}</p>
            ) : (
              <p className="text-xs text-npb-text-muted">
                Use a `.nextpress-theme.json` file exported from NextPress.
              </p>
            )}
          </div>

          {parsedSettings?.ok && mode === 'create' ? (
            <div className="space-y-1.5 rounded-md border border-npb-border-default bg-npb-surface-inset/40 p-3">
              <div className="text-sm font-medium text-npb-text-primary">{parsedName}</div>
              {parsedDescription ? (
                <p className="text-sm text-npb-text-secondary">{parsedDescription}</p>
              ) : null}
            </div>
          ) : null}

          {parsedSettings?.ok && mode === 'replace' ? (
            <div className="space-y-3">
              <p className="text-sm text-npb-text-secondary">
                Colors, fonts, icons, and shape tokens from the file will replace this theme&apos;s
                design settings.
              </p>
              <label className="flex items-center gap-2 text-sm text-npb-text-secondary">
                <Checkbox checked={useFileName} onCheckedChange={(checked) => setUseFileName(checked === true)} />
                Also use name and description from the file
              </label>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="npb-btn-accent"
            disabled={importing || !parsedSettings?.ok}
            onClick={() => void handleImport()}
          >
            {mode === 'create' ? 'Import theme' : 'Replace design'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
