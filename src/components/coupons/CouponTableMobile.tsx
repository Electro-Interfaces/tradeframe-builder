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
      <div className="bg-slate-800 overflow-x-auto -mx-4 sm:mx-0">
        <div className="min-w-full inline-block align-middle">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-700 text-slate-300 border-b border-slate-600">
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
                  className={`hover:bg-slate-600 active:bg-slate-500 cursor-pointer transition-colors border-b border-slate-700 ${
                    index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-750'
                  }`}
                  onClick={() => onCouponClick(coupon)}
                >
                  <td className="px-2 py-3">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-white font-mono text-xs truncate max-w-[120px]" title={coupon.number}>
                        {coupon.number}
                      </span>
                      <span className="text-slate-400 text-[10px] font-mono whitespace-nowrap">
                        {formatCouponDateTime(coupon.dt)}
                      </span>
                      {coupon.state.id === 0 && coupon.qty_used === 0 && (
                        <span className="text-yellow-400 text-[10px] whitespace-nowrap">🔄 Не использован</span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-white font-semibold text-xs whitespace-nowrap">
                        {coupon.service.service_name}
                      </span>
                      <span className="text-slate-300 text-[10px] whitespace-nowrap">{coupon.price.toFixed(2)} ₽/л</span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-white text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="font-bold text-xs whitespace-nowrap">{coupon.rest_qty.toFixed(1)} л</span>
                      <span className="text-slate-300 text-[10px] whitespace-nowrap">{coupon.rest_summ.toFixed(0)} ₽</span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <CouponStatusBadge stateName={coupon.state.name} variant="compact" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {coupons.length === 0 && (
        <div className="text-center py-8 text-slate-400">
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
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            ←
          </Button>
          <span className="text-sm text-slate-400 px-2">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            →
          </Button>
        </div>
      )}
    </div>
  );
}
