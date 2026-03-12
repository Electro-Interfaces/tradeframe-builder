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
    <Card className="bg-card border-border mb-6">
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/50 transition-colors">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">Фильтры</span>
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
                className="border-border text-foreground hover:bg-secondary"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              {filtersOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Поиск */}
              <div>
                <Label htmlFor="search" className="text-xs text-muted-foreground">
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
                <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">
                  Дата от
                </Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>

              {/* Дата окончания */}
              <div>
                <Label htmlFor="dateTo" className="text-xs text-muted-foreground">
                  Дата до
                </Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
