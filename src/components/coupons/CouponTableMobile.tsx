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
    <div>
      <div className="bg-slate-800 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-700 text-slate-300 border-b border-slate-600">
              <th className="px-2 py-2 text-left font-medium">Номер / Дата</th>
              <th className="px-2 py-2 text-center font-medium">Топливо</th>
              <th className="px-2 py-2 text-right font-medium">Остаток</th>
              <th className="px-2 py-2 text-center font-medium">Статус</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon, index) => (
              <tr
                key={coupon.number}
                className={`hover:bg-slate-600 cursor-pointer transition-colors border-b border-slate-700 ${
                  index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-750'
                }`}
                onClick={() => onCouponClick(coupon)}
              >
                <td className="px-2 py-2">
                  <div className="flex flex-col">
                    <span className="text-white font-mono text-xs truncate" title={coupon.number}>
                      {coupon.number}
                    </span>
                    <span className="text-slate-400 text-xs font-mono">
                      {formatCouponDateTime(coupon.dt)}
                    </span>
                    {coupon.state.id === 0 && coupon.qty_used === 0 && (
                      <span className="text-yellow-400 text-xs">🔄 Не использован</span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-white font-semibold text-xs">
                      {coupon.service.service_name}
                    </span>
                    <span className="text-slate-300 text-xs">{coupon.price.toFixed(2)} ₽/л</span>
                  </div>
                </td>
                <td className="px-2 py-2 text-white text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-xs">{coupon.rest_qty.toFixed(1)} л</span>
                    <span className="text-slate-300 text-xs">{coupon.rest_summ.toFixed(0)} ₽</span>
                  </div>
                </td>
                <td className="px-2 py-2 text-center">
                  <CouponStatusBadge stateName={coupon.state.name} variant="compact" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
