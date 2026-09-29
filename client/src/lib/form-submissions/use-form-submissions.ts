import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormSubmission } from '@shared/schema-types';
import type { SubmittedField } from '@shared/form-model';
import { apiRequest } from '@/lib/queryClient';

export const FORM_SUBMISSIONS_PER_PAGE = 20;

export type SubmissionStatusFilter = 'all' | 'new' | 'read';

export type FormSubmissionList = {
  items: FormSubmission[];
  total: number;
  formNames: string[];
  unread: number;
  pageTitles: Record<string, string>;
};

/** The answers of one submission, in the order the form asked them. */
export const readSubmittedFields = (item: FormSubmission): SubmittedField[] =>
  Array.isArray(item.fields) ? (item.fields as SubmittedField[]) : [];

const listUrl = ({
  siteId,
  page,
  formName,
  status,
}: {
  siteId?: string | null;
  page: number;
  formName: string;
  status: SubmissionStatusFilter;
}): string => {
  const params = new URLSearchParams({ page: String(page), per_page: String(FORM_SUBMISSIONS_PER_PAGE) });
  if (siteId) params.set('siteId', siteId);
  if (formName) params.set('form', formName);
  if (status !== 'all') params.set('status', status);
  return `/api/forms/submissions?${params.toString()}`;
};

/** Where "Export CSV" points: every submission of the site (or one form), newest first. */
export const exportCsvUrl = ({ siteId, formName }: { siteId?: string | null; formName: string }): string => {
  const params = new URLSearchParams();
  if (siteId) params.set('siteId', siteId);
  if (formName) params.set('form', formName);
  return `/api/forms/submissions/export?${params.toString()}`;
};

/** List, read state and removal for the Forms admin page. */
export function useFormSubmissions({
  siteId,
  page,
  formName,
  status,
}: {
  siteId?: string | null;
  page: number;
  formName: string;
  status: SubmissionStatusFilter;
}) {
  const queryClient = useQueryClient();
  const url = listUrl({ siteId, page, formName, status });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['/api/forms/submissions'] });

  const list = useQuery<FormSubmissionList>({
    queryKey: ['/api/forms/submissions', { siteId, page, formName, status }],
    queryFn: async () => (await apiRequest('GET', url)).json() as Promise<FormSubmissionList>,
  });

  const setStatus = useMutation({
    mutationFn: ({ id, next }: { id: string; next: 'new' | 'read' }) =>
      apiRequest('PATCH', `/api/forms/submissions/${id}`, { status: next }),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/forms/submissions/${id}`),
    onSuccess: refresh,
  });

  return { list, setStatus, remove };
}
