import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocation } from 'wouter';

interface CreateContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'page' | 'post';
}

/**
 * Dialog for creating new pages or posts.
 * Phase 1: Navigates to creation form with title pre-filled.
 * Phase 2: May support inline creation with full form.
 */
export function CreateContentDialog({
  open,
  onOpenChange,
  type,
}: CreateContentDialogProps) {
  const [title, setTitle] = useState('');
  const [, setLocation] = useLocation();

  const handleCreate = () => {
    if (!title.trim()) return;

    // Navigate to creation form with title pre-filled
    const encodedTitle = encodeURIComponent(title);
    const path = type === 'page'
      ? `/admin/pages?create=true&title=${encodedTitle}`
      : `/admin/posts?create=true&title=${encodedTitle}`;
    
    setLocation(path);
    
    // Reset and close
    setTitle('');
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && title.trim()) {
      handleCreate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            Create New {type === 'page' ? 'Page' : 'Post'}
          </DialogTitle>
          <DialogDescription>
            Enter a title for your new {type}. You'll be able to add content
            and configure settings on the next screen.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder={`Enter ${type} title...`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setTitle('');
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!title.trim()}
          >
            Create {type === 'page' ? 'Page' : 'Post'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
