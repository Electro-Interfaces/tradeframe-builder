/**
 * Компонент фильтров купонов
 */

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Filter, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
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
  filters,
  setFilters,
  filtersOpen,
  setFiltersOpen,
  loading,
  onRefresh,
  onClearFilters
}: CouponFiltersProps) {
  return (
    <Card className="bg-slate-800 border-slate-700 mb-6">
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-700/50 transition-colors">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="font-medium text-white">Фильтры</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearFilters();
                }}
              >
                Очистить фильтры
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh();
                }}
                disabled={loading}
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              {filtersOpen ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 border-t border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Поиск */}
              <div>
                <Label htmlFor="search" className="text-xs text-slate-400">
                  Поиск по номеру
                </Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="Номер купона..."
                  value={filters.search || ''}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>

              {/* Дата начала */}
              <div>
                <Label htmlFor="dateFrom" className="text-xs text-slate-400">
                  Дата от
                </Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
                  }
                  className="mt-1 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>

              {/* Дата окончания */}
              <div>
                <Label htmlFor="dateTo" className="text-xs text-slate-400">
                  Дата до
                </Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
                  }
                  className="mt-1 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
