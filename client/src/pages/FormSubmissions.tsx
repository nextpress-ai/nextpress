import { useState, type JSX } from 'react';
import { Download, Inbox } from 'lucide-react';
import type { FormSubmission } from '@shared/schema-types';
import { AdminLayout } from '@/components/AdminLayout';
import { AdminListPaginationFooter } from '@/components/admin/admin-list-pagination-footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActiveSite } from '@/hooks/useActiveSite';
import { useAdminListPagination } from '@/hooks/use-admin-list-pagination';
import { showErrorToast, showSuccessToast } from '@/lib/sonner-toast';
import {
  exportCsvUrl,
  useFormSubmissions,
  FORM_SUBMISSIONS_PER_PAGE,
  type SubmissionStatusFilter,
} from '@/lib/form-submissions/use-form-submissions';
import { SubmissionsTable } from '@/components/FormSubmissions/SubmissionsTable';
import { SubmissionDialog } from '@/components/FormSubmissions/SubmissionDialog';

const ALL_FORMS = '__all__';

/** Admin → Forms: what visitors sent through Form blocks, newest first. */
export default function FormSubmissionsPage(): JSX.Element {
  const { activeSiteId } = useActiveSite();
  const [page, setPage] = useState(1);
  const [formName, setFormName] = useState('');
  const [status, setStatus] = useState<SubmissionStatusFilter>('all');
  const [open, setOpen] = useState<FormSubmission | null>(null);
  const { list, setStatus: saveStatus, remove } = useFormSubmissions({ siteId: activeSiteId, page, formName, status });

  const data = list.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / FORM_SUBMISSIONS_PER_PAGE)) : undefined;
  const visiblePage = useAdminListPagination({ activeSiteId, page, setPage, totalPages });

  const openItem = (item: FormSubmission) => {
    setOpen(item);
    if (item.status === 'new') saveStatus.mutate({ id: item.id, next: 'read' });
  };

  return (
    <AdminLayout
      title="Forms"
      actions={
        <Button variant="outline" size="sm" asChild disabled={!data?.total}>
          <a href={exportCsvUrl({ siteId: activeSiteId, formName })} download>
            <Download className="mr-2 h-4 w-4" aria-hidden />
            Export CSV
          </a>
        </Button>
      }
    >
      <Card className="admin-surface">
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={formName || ALL_FORMS}
              onValueChange={(value) => {
                setFormName(value === ALL_FORMS ? '' : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[12rem]" aria-label="Form">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FORMS}>All forms</SelectItem>
                {(data?.formNames ?? []).map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as SubmissionStatusFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[9rem]" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="new">New{data?.unread ? ` (${data.unread})` : ''}</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {list.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-11 w-full" />
              ))}
            </div>
          ) : list.isError ? (
            <p className="py-10 text-center text-npb-text-secondary">
              Submissions couldn't be loaded.{' '}
              <Button variant="link" className="px-1" onClick={() => void list.refetch()}>
                Try again
              </Button>
            </p>
          ) : data && data.items.length > 0 ? (
            <>
              <SubmissionsTable items={data.items} pageTitles={data.pageTitles} onOpen={openItem} />
              <AdminListPaginationFooter
                page={visiblePage}
                perPage={FORM_SUBMISSIONS_PER_PAGE}
                total={data.total}
                totalPages={totalPages ?? 1}
                itemLabel="submissions"
                onPageChange={setPage}
              />
            </>
          ) : (
            <p className="flex items-center justify-center gap-2 py-12 text-npb-text-secondary">
              <Inbox className="h-4 w-4" aria-hidden />
              {formName || status !== 'all'
                ? 'Nothing matches these filters.'
                : 'No submissions yet. Add a Form block to a page and publish it.'}
            </p>
          )}
        </CardContent>
      </Card>

      <SubmissionDialog
        item={open}
        pageTitle={open?.pageId ? data?.pageTitles[open.pageId] : undefined}
        onClose={() => setOpen(null)}
        onMarkNew={(item) => {
          saveStatus.mutate({ id: item.id, next: 'new' });
          setOpen(null);
          showSuccessToast('Marked as new');
        }}
        onDelete={async (item) => {
          await remove
            .mutateAsync(item.id)
            .then(() => {
              setOpen(null);
              showSuccessToast('Submission deleted');
            })
            .catch((error: Error) => {
              console.error('[forms] Delete failed', { atFunction: 'FormSubmissionsPage.onDelete', submissionId: item.id, error });
              showErrorToast("Couldn't delete it. Please try again.");
            });
        }}
      />
    </AdminLayout>
  );
}
