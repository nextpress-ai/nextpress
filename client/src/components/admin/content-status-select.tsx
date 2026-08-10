import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatContentStatus } from '@/lib/format-content-status';
import { VERSION_STALE } from '@shared/content-version';

type ContentStatus = 'publish' | 'draft' | 'private' | 'trash';

type ContentStatusSelectProps = {
  contentKind: 'post' | 'page';
  contentId: string;
  status: string;
  version?: number;
  queryKeys: QueryKey[];
};

const STATUS_OPTIONS: ContentStatus[] = ['publish', 'draft', 'private', 'trash'];

/**
 * Inline status control for admin list rows.
 */
export function ContentStatusSelect({
  contentKind,
  contentId,
  status,
  version = 0,
  queryKeys,
}: ContentStatusSelectProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const apiBase = contentKind === 'post' ? '/api/posts' : '/api/pages';

  const mutation = useMutation({
    mutationFn: async (nextStatus: ContentStatus) => {
      const response = await apiRequest('PUT', `${apiBase}/${contentId}`, {
        status: nextStatus,
        expectedVersion: version,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Status updated',
        description: `${contentKind === 'post' ? 'Post' : 'Page'} status changed successfully.`,
      });
      queryKeys.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
      });
    },
    onError: (error: Error & { code?: string }) => {
      if (error.code === VERSION_STALE) {
        toast({
          title: 'Could not update status',
          description: 'This item changed elsewhere. Refresh the list and try again.',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Could not update status',
        description: 'Something went wrong while saving the new status.',
        variant: 'destructive',
      });
    },
  });

  return (
    <Select
      value={status || 'draft'}
      onValueChange={(value) => mutation.mutate(value as ContentStatus)}
      disabled={mutation.isPending}
    >
      <SelectTrigger
        className="h-8 w-[132px] border-0 bg-npb-surface-inset text-npb-text-primary text-xs"
        aria-label={`Change status for this ${contentKind}`}
      >
        <SelectValue>{formatContentStatus(status)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {formatContentStatus(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
