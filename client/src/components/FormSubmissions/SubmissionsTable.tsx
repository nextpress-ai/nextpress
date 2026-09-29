import type { JSX } from 'react';
import type { FormSubmission } from '@shared/schema-types';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { readSubmittedFields } from '@/lib/form-submissions/use-form-submissions';

const EMAIL = /\S+@\S+\.\S+/;

/** Who sent it: their email if they gave one, else their first answer. */
const senderOf = (item: FormSubmission): string => {
  const fields = readSubmittedFields(item);
  return fields.find((field) => EMAIL.test(field.value))?.value ?? fields[0]?.value ?? '—';
};

/** The longest answer reads best as a preview (usually the message). */
const previewOf = (item: FormSubmission): string => {
  const longest = [...readSubmittedFields(item)].sort((a, b) => b.value.length - a.value.length)[0];
  return longest?.value ?? '';
};

const formatSent = (value: FormSubmission['createdAt']): string =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

type SubmissionsTableProps = {
  items: FormSubmission[];
  pageTitles: Record<string, string>;
  onOpen: (item: FormSubmission) => void;
};

/** One row per send; new ones stand out. A row opens the full submission. */
export function SubmissionsTable({ items, pageTitles, onOpen }: SubmissionsTableProps): JSX.Element {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[11rem]">Sent</TableHead>
          <TableHead>From</TableHead>
          <TableHead className="hidden md:table-cell">Message</TableHead>
          <TableHead className="hidden lg:table-cell">Form · Page</TableHead>
          <TableHead className="w-[6rem]">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const isNew = item.status === 'new';
          return (
            <TableRow
              key={item.id}
              tabIndex={0}
              role="button"
              aria-label={`Open submission from ${senderOf(item)}`}
              className="cursor-pointer"
              onClick={() => onOpen(item)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onOpen(item);
                }
              }}
            >
              <TableCell className="whitespace-nowrap text-npb-text-secondary">{formatSent(item.createdAt)}</TableCell>
              <TableCell className={isNew ? 'font-semibold text-npb-text-primary' : 'text-npb-text-primary'}>
                <span className="block max-w-[16rem] truncate">{senderOf(item)}</span>
              </TableCell>
              <TableCell className="hidden text-npb-text-secondary md:table-cell">
                <span className="block max-w-[28rem] truncate">{previewOf(item)}</span>
              </TableCell>
              <TableCell className="hidden text-npb-text-secondary lg:table-cell">
                {item.formName}
                {item.pageId && pageTitles[item.pageId] ? ` · ${pageTitles[item.pageId]}` : ''}
              </TableCell>
              <TableCell>
                <Badge variant={isNew ? 'default' : 'secondary'}>{isNew ? 'New' : 'Read'}</Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export { formatSent };
