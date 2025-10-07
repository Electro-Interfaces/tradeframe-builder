/**
 * Модальное окно с деталями купона
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CouponStatusBadge } from './CouponStatusBadge';
import { formatCouponFullDateTime } from '@/utils/couponFormatters';
import type { Coupon } from '@/types/coupons';

interface CouponDetailsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  coupon: Coupon | null;
}

export function CouponDetailsModal({ isOpen, onOpenChange, coupon }: CouponDetailsModalProps) {
  if (!coupon) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto bg-slate-800 border border-slate-600 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base font-semibold text-white">
            Купон #{coupon.number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-1 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">Статус:</span>
              <div>
                <CouponStatusBadge stateName={coupon.state.name} />
              </div>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-700 bg-blue-900/30 px-2 -mx-2 rounded">
              <span className="text-slate-300 font-medium">Тип топлива:</span>
              <span className="text-blue-300 font-bold text-lg">{coupon.service.service_name}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">Цена за литр:</span>
              <span className="text-white font-mono text-sm">{coupon.price.toFixed(2)} ₽/л</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-700 bg-green-900/30 px-2 -mx-2 rounded">
              <span className="text-slate-300 font-medium">Остаток:</span>
              <div className="text-right">
                <div className="text-green-300 font-bold text-lg">{coupon.rest_qty.toFixed(1)} литров</div>
                <div className="text-slate-400 text-xs">на сумму {coupon.rest_summ.toFixed(2)} ₽</div>
              </div>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">Использовано:</span>
              <span className="text-white font-mono text-sm">
                {coupon.qty_used.toFixed(1)} л из {coupon.qty_total.toFixed(1)} л
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">Дата выдачи:</span>
              <span className="text-white font-mono text-xs">
                {formatCouponFullDateTime(coupon.dt)}
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-700">
              <span className="text-slate-400">Номер смены:</span>
              <span className="text-white font-mono text-sm">
                Смена #{coupon.shift}, операция #{coupon.opernum}
              </span>
            </div>

            {coupon.state.id === 0 && coupon.qty_used === 0 && (
              <div className="flex justify-between py-2 border-b border-slate-700 bg-yellow-900/30 px-2 -mx-2 rounded">
                <span className="text-slate-300 font-medium">Статус:</span>
                <div className="text-right">
                  <div className="text-yellow-300 font-bold">🔄 Не использован</div>
                  <div className="text-slate-400 text-xs">Купон не использовался</div>
                </div>
              </div>
            )}

            <div className="flex justify-between py-2 text-xs">
              <span className="text-slate-500">Номер купона:</span>
              <span className="text-slate-400 font-mono">{coupon.number}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
