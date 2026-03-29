/**
 * Десктопная таблица купонов
 */

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CouponStatusBadge } from './CouponStatusBadge';
import { formatCouponDate, formatCouponTime } from '@/utils/couponFormatters';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Copy, Loader2 } from 'lucide-react';
import type { CouponWithAge } from '@/types/coupons';

interface CouponTableProps {
  coupons: CouponWithAge[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading: boolean;
}

export function CouponTable({ coupons, currentPage, totalPages, onPageChange, loading }: CouponTableProps) {
  const { toast } = useToast();

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary dark:bg-di-surface-highest border-b-2 border-di-outline-variant/20 hover:bg-secondary dark:hover:bg-di-surface-highest">
            <TableHead className="text-xs font-semibold text-foreground/80 whitespace-nowrap py-3">ТТ</TableHead>
            <TableHead className="text-xs font-semibold text-foreground/80 whitespace-nowrap py-3">Номер купона</TableHead>
            <TableHead className="text-xs font-semibold text-foreground/80 whitespace-nowrap py-3">Дата создания</TableHead>
            <TableHead className="text-xs font-semibold text-foreground/80 whitespace-nowrap py-3">Тип топлива</TableHead>
            <TableHead className="text-xs font-semibold text-foreground/80 whitespace-nowrap py-3">Цена за литр</TableHead>
            <TableHead className="text-xs font-semibold text-foreground/80 whitespace-nowrap py-3">Остаток (л)</TableHead>
            <TableHead className="text-xs font-semibold text-foreground/80 whitespace-nowrap py-3">Остаток (₽)</TableHead>
            <TableHead className="text-xs font-semibold text-foreground/80 whitespace-nowrap py-3">Статус</TableHead>
            <TableHead className="text-xs font-semibold text-foreground/80 whitespace-nowrap py-3">Тип</TableHead>
            <TableHead className="text-xs font-semibold text-foreground/80 whitespace-nowrap py-3">Автор</TableHead>
            <TableHead className="text-xs font-semibold text-foreground/80 whitespace-nowrap py-3">Комментарий</TableHead>
            <TableHead className="text-xs font-semibold text-foreground/80 whitespace-nowrap py-3">Смена</TableHead>
            <TableHead className="text-xs font-semibold text-foreground/80 whitespace-nowrap py-3">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {coupons.map((coupon) => (
            <TableRow key={coupon.number} className={`border-border hover:bg-card ${coupon.isOptimistic ? 'bg-amber-100 dark:bg-amber-900/20 border-l-2 border-l-amber-500' : ''}`}>
              <TableCell className="text-foreground/80 text-sm min-w-[120px]">
                <span>{coupon.stationName || `ТТ ${coupon.stationCode}`}</span>
              </TableCell>
              <TableCell className="text-foreground/80 font-mono text-sm min-w-[120px]">
                <div className="flex flex-col">
                  <span>{coupon.number}</span>
                  {coupon.isOptimistic ? (
                    <span className="text-amber-600 dark:text-amber-400 text-xs flex items-center gap-1 animate-pulse">
                      ⏳ Ожидает подтверждения
                    </span>
                  ) : coupon.state.id === 0 && coupon.qty_used === 0 ? (
                    <span className="text-yellow-600 dark:text-yellow-400 text-xs flex items-center gap-1">
                      🔄 Не использован
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-foreground/80 text-sm min-w-[140px]">
                <div className="flex flex-col">
                  <span className="font-mono">{formatCouponDate(coupon.dt)}</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatCouponTime(coupon.dt)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-foreground/80 text-sm min-w-[100px] text-center">
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-foreground">
                    {coupon.service.service_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {coupon.qty_used > 0
                      ? `Исп: ${coupon.qty_used.toFixed(1)}л`
                      : 'Не использован'}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-foreground/80 text-sm min-w-[100px] text-right">
                <span className="font-mono">{coupon.price.toFixed(2)} ₽</span>
              </TableCell>
              <TableCell className="text-foreground/80 text-sm min-w-[120px] text-right font-bold">
                <div className="flex flex-col items-end">
                  <span className={`font-bold ${
                    coupon.rest_qty < 0 ? 'text-red-500 dark:text-red-400' :
                    coupon.rest_qty === 0 ? 'text-muted-foreground' :
                    'text-emerald-600 dark:text-emerald-400'
                  }`}>{coupon.rest_qty.toFixed(1)} л</span>
                  <span className="text-xs text-muted-foreground">
                    из {coupon.qty_total.toFixed(1)} л
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-foreground/80 text-sm min-w-[100px] text-right font-bold">
                <span className={
                  coupon.rest_summ < 0 ? 'text-red-500 dark:text-red-400' :
                  coupon.rest_summ === 0 ? 'text-muted-foreground' :
                  'text-emerald-600 dark:text-emerald-400'
                }>{coupon.rest_summ.toFixed(2)} ₽</span>
              </TableCell>
              <TableCell className="min-w-[100px]">
                <CouponStatusBadge stateName={coupon.state.name} />
              </TableCell>
              <TableCell className="min-w-[80px]">
                {coupon.type ? (
                  <Badge className={`text-[10px] px-1.5 py-0.5 ${
                    coupon.type.id === 0
                      ? 'bg-secondary text-foreground hover:bg-muted-foreground'
                      : 'bg-blue-600 text-white hover:bg-blue-500'
                  }`}>
                    {coupon.type.name}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </TableCell>
              <TableCell className="text-foreground/80 text-sm min-w-[100px]">
                {coupon.user ? (
                  <span className="text-xs">{coupon.user.name}</span>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </TableCell>
              <TableCell className="text-foreground/80 text-sm min-w-[140px]">
                {coupon.comment ? (
                  <span className="text-xs truncate max-w-[140px] block" title={coupon.comment}>
                    {coupon.comment}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </TableCell>
              <TableCell className="text-foreground/80 text-sm min-w-[120px]">
                <div className="flex flex-col">
                  <span className="text-xs">Смена #{coupon.shift}</span>
                  <span className="text-xs text-muted-foreground">Операция #{coupon.opernum}</span>
                </div>
              </TableCell>
              <TableCell className="min-w-[100px]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(coupon.number);
                    toast({
                      title: 'Номер скопирован',
                      description: `Номер купона ${coupon.number} скопирован`
                    });
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
        <div className="flex items-center justify-center gap-4 py-6 border-t border-border mt-4">
          <Button
            variant="outline"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="border-border text-foreground/80 hover:bg-secondary"
          >
            ← Предыдущая страница
          </Button>

          <div className="flex items-center gap-2">
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                  className={
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border-border text-foreground/80 hover:bg-secondary'
                  }
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="border-border text-foreground/80 hover:bg-secondary"
          >
            Следующая страница →
          </Button>
        </div>
      )}
    </div>
  );
}
