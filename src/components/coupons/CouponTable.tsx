/**
 * Десктопная таблица купонов
 */

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CouponStatusBadge } from './CouponStatusBadge';
import { formatCouponDate, formatCouponTime } from '@/utils/couponFormatters';
import { useToast } from '@/hooks/use-toast';
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
          <TableRow className="border-slate-700 hover:bg-slate-800">
            <TableHead className="text-slate-300 min-w-[120px]">ТТ</TableHead>
            <TableHead className="text-slate-300 min-w-[120px]">Номер купона</TableHead>
            <TableHead className="text-slate-300 min-w-[140px]">Дата создания</TableHead>
            <TableHead className="text-slate-300 min-w-[100px]">Тип топлива</TableHead>
            <TableHead className="text-slate-300 min-w-[100px]">Цена за литр</TableHead>
            <TableHead className="text-slate-300 min-w-[120px]">Остаток (л)</TableHead>
            <TableHead className="text-slate-300 min-w-[100px]">Остаток (₽)</TableHead>
            <TableHead className="text-slate-300 min-w-[100px]">Статус</TableHead>
            <TableHead className="text-slate-300 min-w-[120px]">Смена</TableHead>
            <TableHead className="text-slate-300 min-w-[100px]">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {coupons.map((coupon) => (
            <TableRow key={coupon.number} className="border-slate-700 hover:bg-slate-800">
              <TableCell className="text-slate-300 text-sm min-w-[120px]">
                <span>{coupon.stationName || `ТТ ${coupon.stationCode}`}</span>
              </TableCell>
              <TableCell className="text-slate-300 font-mono text-sm min-w-[120px]">
                <div className="flex flex-col">
                  <span>{coupon.number}</span>
                  {coupon.state.id === 0 && coupon.qty_used === 0 && (
                    <span className="text-yellow-400 text-xs flex items-center gap-1">
                      🔄 Не использован
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-slate-300 text-sm min-w-[140px]">
                <div className="flex flex-col">
                  <span className="font-mono">{formatCouponDate(coupon.dt)}</span>
                  <span className="text-xs text-slate-400 font-mono">
                    {formatCouponTime(coupon.dt)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-slate-300 text-sm min-w-[100px] text-center">
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-blue-300">
                    {coupon.service.service_name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {coupon.qty_used > 0
                      ? `Исп: ${coupon.qty_used.toFixed(1)}л`
                      : 'Не использован'}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-slate-300 text-sm min-w-[100px] text-right">
                <span className="font-mono">{coupon.price.toFixed(2)} ₽</span>
              </TableCell>
              <TableCell className="text-slate-300 text-sm min-w-[120px] text-right font-bold">
                <div className="flex flex-col items-end">
                  <span className="text-green-400 font-bold">{coupon.rest_qty.toFixed(1)} л</span>
                  <span className="text-xs text-slate-400">
                    из {coupon.qty_total.toFixed(1)} л
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-slate-300 text-sm min-w-[100px] text-right font-bold">
                <span className="text-green-400">{coupon.rest_summ.toFixed(2)} ₽</span>
              </TableCell>
              <TableCell className="min-w-[100px]">
                <CouponStatusBadge stateName={coupon.state.name} />
              </TableCell>
              <TableCell className="text-slate-300 text-sm min-w-[120px]">
                <div className="flex flex-col">
                  <span className="text-xs">Смена #{coupon.shift}</span>
                  <span className="text-xs text-slate-400">Операция #{coupon.opernum}</span>
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
                  className="text-slate-400 hover:text-white"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
        <div className="flex items-center justify-center gap-4 py-6 border-t border-slate-700 mt-4">
          <Button
            variant="outline"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
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
                      : 'border-slate-600 text-slate-300 hover:bg-slate-700'
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
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Следующая страница →
          </Button>
        </div>
      )}
    </div>
  );
}
