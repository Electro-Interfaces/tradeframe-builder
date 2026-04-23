/**
 * Фильтры купонов — поля ввода (без обёртки, управляется снаружи)
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CouponsFilter } from '@/types/coupons';

interface CouponFiltersProps {
  filters: CouponsFilter;
  setFilters: (filters: CouponsFilter | ((prev: CouponsFilter) => CouponsFilter)) => void;
}

export function CouponFilters({ filters, setFilters }: CouponFiltersProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      <div>
        <Label className="text-xs text-muted-foreground">Номер купона</Label>
        <Input
          type="text"
          placeholder="Поиск..."
          value={filters.search || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          className="mt-1 border-di-outline-variant/20 bg-di-surface-low"
        />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Дата от</Label>
        <Input
          type="date"
          value={filters.dateFrom || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
          className="mt-1 border-di-outline-variant/20 bg-di-surface-low"
        />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Дата до</Label>
        <Input
          type="date"
          value={filters.dateTo || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
          className="mt-1 border-di-outline-variant/20 bg-di-surface-low"
        />
      </div>
    </div>
  );
}
