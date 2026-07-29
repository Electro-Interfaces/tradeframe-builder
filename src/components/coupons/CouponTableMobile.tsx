/**
 * Мобильная таблица купонов
 */

import { Button } from '@/components/ui/button';
import { CouponStatusBadge } from './CouponStatusBadge';
import { formatCouponDateTime } from '@/utils/couponFormatters';
import { Loader2 } from 'lucide-react';
import type { CouponWithAge } from '@/types/coupons';

interface CouponTableMobileProps {
  coupons: CouponWithAge[];
  onCouponClick: (coupon: CouponWithAge) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading: boolean;
}

export function CouponTableMobile({
  coupons,
  onCouponClick,
  currentPage,
  totalPages,
  onPageChange,
  loading
}: CouponTableMobileProps) {
  return (
    <div className="w-full">
      <div className="bg-card overflow-x-auto -mx-4 sm:mx-0">
        <div className="min-w-full inline-block align-middle">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-secondary text-foreground/80 border-b border-border">
                <th className="px-2 py-2 text-left font-medium whitespace-nowrap">Номер / Дата</th>
                <th className="px-2 py-2 text-center font-medium whitespace-nowrap">Топливо</th>
                <th className="px-2 py-2 text-right font-medium whitespace-nowrap">Остаток</th>
                <th className="px-2 py-2 text-center font-medium whitespace-nowrap">Статус</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon, index) => (
                <tr
                  key={coupon.number}
                  className={`hover:bg-secondary active:bg-muted-foreground cursor-pointer transition-colors border-b border-border ${
                    coupon.isOptimistic ? 'bg-amber-100 dark:bg-amber-900/20 border-l-2 border-l-amber-500' : (index % 2 === 0 ? 'bg-card' : 'bg-secondary')
                  }`}
                  onClick={() => onCouponClick(coupon)}
                >
                  <td className="px-2 py-3">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-foreground font-mono text-xs truncate max-w-[120px]" title={coupon.number}>
                        {coupon.number}
                      </span>
                      <span className="text-muted-foreground text-[10px] font-mono whitespace-nowrap">
                        {formatCouponDateTime(coupon.dt)}
                      </span>
                      {coupon.redeemedAt && (
                        <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-mono whitespace-nowrap">
                          ✓ {formatCouponDateTime(coupon.redeemedAt)}
                        </span>
                      )}
                      {coupon.isOptimistic ? (
                        <span className="text-amber-600 dark:text-amber-400 text-[10px] whitespace-nowrap animate-pulse">⏳ Ожидает подтверждения</span>
                      ) : coupon.state.id === 0 && coupon.qty_used === 0 ? (
                        <span className="text-yellow-600 dark:text-yellow-400 text-[10px] whitespace-nowrap">🔄 Не использован</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-semibold text-xs whitespace-nowrap">
                        {coupon.service.service_name}
                      </span>
                      <span className="text-foreground/80 text-[10px] whitespace-nowrap">{coupon.price.toFixed(2)} ₽/л</span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className={`font-bold text-xs whitespace-nowrap ${
                        coupon.rest_qty < 0 ? 'text-red-500 dark:text-red-400' :
                        coupon.rest_qty === 0 ? 'text-muted-foreground' :
                        'text-emerald-600 dark:text-emerald-400'
                      }`}>{coupon.rest_qty.toFixed(1)} л</span>
                      <span className={`text-[10px] whitespace-nowrap ${
                        coupon.rest_summ < 0 ? 'text-red-500 dark:text-red-400' :
                        coupon.rest_summ === 0 ? 'text-muted-foreground' :
                        'text-emerald-600 dark:text-emerald-400'
                      }`}>{coupon.rest_summ.toFixed(0)} ₽</span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <CouponStatusBadge stateName={coupon.state.name} variant="compact" />
                      {coupon.type && (
                        <span className={`text-[9px] ${
                          coupon.type.id === 0 ? 'text-muted-foreground' : 'text-primary dark:text-primary/70'
                        }`}>
                          {coupon.type.name}
                        </span>
                      )}
                      {coupon.user && (
                        <span className="text-[9px] text-muted-foreground truncate max-w-[60px]" title={coupon.user.name}>
                          {coupon.user.name}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {coupons.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Загрузка купонов...</span>
            </div>
          ) : (
            'Нет купонов по выбранным фильтрам'
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            
          >
            ←
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            
          >
            →
          </Button>
        </div>
      )}
    </div>
  );
}
