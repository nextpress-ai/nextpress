import { useCallback, useMemo, useState } from "react";

type Identifiable = { id: string };

/**
 * Row selection for admin list tables (pages, posts, and similar).
 */
export function useBulkSelection<T extends Identifiable>(visibleItems: T[]) {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

	const visibleIds = useMemo(() => visibleItems.map((item) => item.id), [visibleItems]);

	const allSelected =
		visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

	const someSelected =
		visibleIds.some((id) => selectedIds.has(id)) && !allSelected;

	const toggleOne = useCallback((id: string, checked: boolean) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (checked) {
				next.add(id);
			} else {
				next.delete(id);
			}
			return next;
		});
	}, []);

	const toggleAllVisible = useCallback(
		(checked: boolean) => {
			setSelectedIds((prev) => {
				const next = new Set(prev);
				if (checked) {
					for (const id of visibleIds) {
						next.add(id);
					}
				} else {
					for (const id of visibleIds) {
						next.delete(id);
					}
				}
				return next;
			});
		},
		[visibleIds],
	);

	const clear = useCallback(() => {
		setSelectedIds(new Set());
	}, []);

	const selectedCount = selectedIds.size;

	const selectedIdList = useMemo(() => [...selectedIds], [selectedIds]);

	return {
		selectedIds,
		selectedIdList,
		selectedCount,
		allSelected,
		someSelected,
		toggleOne,
		toggleAllVisible,
		clear,
	};
}
