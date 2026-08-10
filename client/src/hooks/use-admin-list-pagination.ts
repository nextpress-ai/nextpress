import { useEffect, type Dispatch, type SetStateAction } from "react";

type UseAdminListPaginationParams = {
	activeSiteId: string;
	page: number;
	setPage: Dispatch<SetStateAction<number>>;
	totalPages?: number;
};

const clampPage = (page: number, totalPages: number): number => {
	if (totalPages <= 0) return 1;
	return Math.min(Math.max(page, 1), totalPages);
};

/**
 * Keeps list pagination valid when site scope or server totals change.
 */
export function useAdminListPagination({
	activeSiteId,
	page,
	setPage,
	totalPages,
}: UseAdminListPaginationParams): number {
	const visiblePage =
		totalPages === undefined ? page : clampPage(page, totalPages);

	useEffect(() => {
		setPage(1);
	}, [activeSiteId, setPage]);

	useEffect(() => {
		if (totalPages === undefined) return;
		setPage((currentPage) => clampPage(currentPage, totalPages));
	}, [setPage, totalPages]);

	return visiblePage;
}
