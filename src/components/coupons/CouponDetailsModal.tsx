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
      <DialogContent className="max-w-sm mx-auto bg-card border border-border text-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base font-semibold text-foreground">
            Купон #{coupon.number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-1 text-sm">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Статус:</span>
              <div>
                <CouponStatusBadge stateName={coupon.state.name} />
              </div>
            </div>

            <div className="flex justify-between py-2 border-b border-border bg-primary/10 dark:bg-blue-900/30 px-2 -mx-2 rounded">
              <span className="text-foreground/80 font-medium">Тип топлива:</span>
              <span className="text-primary dark:text-blue-300 font-bold text-lg">{coupon.service.service_name}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Цена за литр:</span>
              <span className="text-foreground font-mono text-sm">{coupon.price.toFixed(2)} ₽/л</span>
            </div>

            <div className="flex justify-between py-2 border-b border-border bg-emerald-100 dark:bg-emerald-900/30 px-2 -mx-2 rounded">
              <span className="text-foreground/80 font-medium">Остаток:</span>
              <div className="text-right">
                <div className="text-green-600 dark:text-green-300 font-bold text-lg">{coupon.rest_qty.toFixed(1)} литров</div>
                <div className="text-muted-foreground text-xs">на сумму {coupon.rest_summ.toFixed(2)} ₽</div>
              </div>
            </div>

            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Использовано:</span>
              <span className="text-foreground font-mono text-sm">
                {coupon.qty_used.toFixed(1)} л из {coupon.qty_total.toFixed(1)} л
              </span>
            </div>

            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Дата выдачи:</span>
              <span className="text-foreground font-mono text-xs">
                {formatCouponFullDateTime(coupon.dt)}
              </span>
            </div>

            {coupon.type && (
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Тип создания:</span>
                <span className={`font-medium text-sm ${
                  coupon.type.id === 0 ? 'text-foreground/80' : 'text-purple-600 dark:text-purple-300'
                }`}>
                  {coupon.type.name}
                </span>
              </div>
            )}

            {coupon.user && (
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Автор:</span>
                <span className="text-foreground text-sm">{coupon.user.name}</span>
              </div>
            )}

            {coupon.comment && (
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Комментарий:</span>
                <span className="text-foreground text-sm text-right max-w-[200px]">{coupon.comment}</span>
              </div>
            )}

            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Номер смены:</span>
              <span className="text-foreground font-mono text-sm">
                Смена #{coupon.shift}, операция #{coupon.opernum}
              </span>
            </div>

            {coupon.state.id === 0 && coupon.qty_used === 0 && (
              <div className="flex justify-between py-2 border-b border-border bg-yellow-100 dark:bg-yellow-900/30 px-2 -mx-2 rounded">
                <span className="text-foreground/80 font-medium">Статус:</span>
                <div className="text-right">
                  <div className="text-yellow-600 dark:text-yellow-300 font-bold">🔄 Не использован</div>
                  <div className="text-muted-foreground text-xs">Купон не использовался</div>
                </div>
              </div>
            )}

            <div className="flex justify-between py-2 text-xs">
              <span className="text-muted-foreground">Номер купона:</span>
              <span className="text-muted-foreground font-mono">{coupon.number}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
