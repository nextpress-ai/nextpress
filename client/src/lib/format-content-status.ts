const STATUS_LABELS: Record<string, string> = {
  publish: 'Published',
  draft: 'Draft',
  private: 'Private',
  trash: 'Trash',
};

/**
 * User-facing status label for admin lists.
 */
export const formatContentStatus = (status: string | null | undefined): string => {
  if (!status) return 'Draft';
  return STATUS_LABELS[status] ?? status;
};
