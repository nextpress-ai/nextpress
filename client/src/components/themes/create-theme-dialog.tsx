import { useState, type JSX } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { ThemeSettings } from '@shared/theme-settings';
import type { Theme } from '@shared/schema-types';

type CreateThemeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (theme: Theme) => void;
  initialName?: string;
  initialDescription?: string;
  initialSettings?: ThemeSettings;
  title?: string;
  submitLabel?: string;
};

/**
 * Creates a new custom theme, then selects it in the workspace for design tweaks.
 */
export function CreateThemeDialog({
  open,
  onOpenChange,
  onCreated,
  initialName = '',
  initialDescription = '',
  initialSettings,
  title = 'New theme',
  submitLabel = 'Create and edit',
}: CreateThemeDialogProps): JSX.Element {
  const { toast } = useToast();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [creating, setCreating] = useState(false);

  const reset = (): void => {
    setName(initialName);
    setDescription(initialDescription);
  };

  const handleClose = (nextOpen: boolean): void => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleCreate = async (): Promise<void> => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({
        title: 'Name required',
        description: 'Give your theme a name to continue.',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const response = await apiRequest('POST', '/api/themes', {
        name: trimmedName,
        description: description.trim() || undefined,
        settings: initialSettings,
      });
      const theme = (await response.json()) as Theme;
      toast({
        title: 'Theme created',
        description: 'Adjust colors and fonts in the workspace, then save when you are ready.',
      });
      handleClose(false);
      onCreated(theme);
    } catch {
      toast({
        title: 'Could not create theme',
        description: 'Try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setName(initialName);
          setDescription(initialDescription);
        }
        handleClose(nextOpen);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-theme-name">Name</Label>
            <Input
              id="new-theme-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Summer launch"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-theme-description">Description</Label>
            <Textarea
              id="new-theme-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Light background with bold accent for campaign pages"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="npb-btn-accent"
            disabled={creating}
            onClick={() => void handleCreate()}
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
