/**
 * Фильтры купонов — плоская панель Command Center
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Search, X } from 'lucide-react';
import type { CouponsFilter } from '@/types/coupons';

interface CouponFiltersProps {
  filters: CouponsFilter;
  setFilters: (filters: CouponsFilter | ((prev: CouponsFilter) => CouponsFilter)) => void;
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean) => void;
  loading: boolean;
  onRefresh: () => void;
  onClearFilters: () => void;
}

export function CouponFilters({
  filters, setFilters, loading, onRefresh, onClearFilters
}: CouponFiltersProps) {
  const hasFilters = !!(filters.search || filters.dateFrom || filters.dateTo);

  return (
    <div className="bg-di-surface-mid rounded-xl border border-transparent p-3 md:p-5 mb-4">
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-4">
        {/* Поиск */}
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Номер купона</label>
          <div className="relative">
            <Input
              type="text"
              placeholder="Поиск..."
              value={filters.search || ''}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="border-di-outline-variant/20 bg-di-surface-lowest pr-8"
            />
            <Search className="absolute right-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* Дата от */}
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Дата от</label>
          <Input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
            className="border-di-outline-variant/20 bg-di-surface-lowest"
          />
        </div>

        {/* Дата до */}
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Дата до</label>
          <Input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
            className="border-di-outline-variant/20 bg-di-surface-lowest"
          />
        </div>

        {/* Actions */}
        <div className="flex items-end gap-2">
          {hasFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="border-di-outline-variant/15 text-muted-foreground hover:bg-di-surface-high"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="border-di-outline-variant/15 text-muted-foreground hover:bg-di-surface-high"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
    </div>
  );
}
