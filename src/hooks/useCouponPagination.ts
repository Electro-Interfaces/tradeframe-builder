/**
 * Хук для управления пагинацией купонов
 */

import { useState, useMemo, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import type { CouponWithAge } from '@/types/coupons';

export function useCouponPagination(items: CouponWithAge[]) {
  const isMobile = useIsMobile();
  const itemsPerPage = isMobile ? 20 : 50;

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Пагинированные элементы
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pages = Math.ceil(items.length / itemsPerPage);
    setTotalPages(pages);
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, itemsPerPage]);

  // Сброс на первую страницу при изменении items
  useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);

  // Навигация
  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const goToPrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)));
  };

  return {
    currentPage,
    totalPages,
    paginatedItems,
    setCurrentPage: goToPage,
    goToNextPage,
    goToPrevPage,
    itemsPerPage
  };
}
