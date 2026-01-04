/**
 * Таблица детальных транзакций с пагинацией
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreditCard } from 'lucide-react';
import type { ReconciliationTransaction, ReconciliationTransactionStatus } from '@/types/reconciliation';
import { formatDateTime, getStatusColorClass, getStatusText } from './reconciliationUtils';

interface ReconciliationTransactionsTableProps {
  paginatedTransactions: ReconciliationTransaction[];
  totalTransactions: number;
  filteredCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function StatusBadge({ status }: { status: ReconciliationTransactionStatus }) {
  return (
    <Badge className={`${getStatusColorClass(status)} text-white`}>
      {getStatusText(status)}
    </Badge>
  );
}

export function ReconciliationTransactionsTable({
  paginatedTransactions,
  totalTransactions,
  filteredCount,
  currentPage,
  totalPages,
  onPageChange
}: ReconciliationTransactionsTableProps) {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Детальные транзакции
          </CardTitle>
          <span className="text-slate-400 text-xs">
            {filteredCount} из {totalTransactions}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700">
              <TableHead className="text-slate-400">Дата/время</TableHead>
              <TableHead className="text-slate-400">Станция</TableHead>
              <TableHead className="text-slate-400">Топливо</TableHead>
              <TableHead className="text-slate-400">Карта</TableHead>
              <TableHead className="text-slate-400">Смена</TableHead>
              <TableHead className="text-slate-400 text-right">Corp (л)</TableHead>
              <TableHead className="text-slate-400 text-right">TF (л)</TableHead>
              <TableHead className="text-slate-400 text-center">Статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTransactions.map(tx => (
              <TableRow
                key={tx.id}
                className={`border-slate-700/50 ${
                  tx.status !== 'matched' ? 'bg-red-900/10' : ''
                }`}
              >
                <TableCell className="text-slate-300 text-sm">
                  {formatDateTime(tx.date)}
                </TableCell>
                <TableCell className="text-white text-sm">{tx.stationName}</TableCell>
                <TableCell className="text-slate-300 text-sm">{tx.fuelType}</TableCell>
                <TableCell className="text-slate-400 text-sm font-mono">
                  {tx.cardNumber || '—'}
                </TableCell>
                <TableCell className="text-slate-400 text-sm">
                  {tx.shiftId ? `#${tx.shiftId}` : <span className="text-orange-400">—</span>}
                </TableCell>
                <TableCell className="text-right">
                  {tx.corpLiters !== null ? (
                    <span className="text-purple-400">{tx.corpLiters}</span>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {tx.tfLiters !== null ? (
                    <span className="text-blue-400">{tx.tfLiters}</span>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <StatusBadge status={tx.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Пагинация */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
            <span className="text-slate-400 text-sm">
              Страница {currentPage} из {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="border-slate-600 text-slate-300"
              >
                Назад
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="border-slate-600 text-slate-300"
              >
                Вперёд
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
