import { useState, useMemo } from 'react';

export function usePagination(items, pageSize = 20) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  const safePage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  function goToPage(page) {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }

  // Reset to page 1 whenever items change length (e.g. filter applied)
  useMemo(() => {
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  return {
    currentPage: safePage,
    totalPages,
    paginatedItems,
    goToPage,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1,
    totalItems: items.length,
    pageSize,
  };
}
