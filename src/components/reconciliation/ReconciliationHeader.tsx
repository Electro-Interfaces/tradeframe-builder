/**
 * Заголовок результатов сверки
 */

import { Button } from '@/components/ui/button';
import { FileSearch, Download, RefreshCw } from 'lucide-react';
import type { ReconciliationResult } from '@/types/reconciliation';
import { exportReconciliationToExcel } from '@/utils/reconciliationExport';
import { formatDate } from './reconciliationUtils';

interface ReconciliationHeaderProps {
  result: ReconciliationResult;
  onNewReconciliation: () => void;
}

export function ReconciliationHeader({
  result,
  onNewReconciliation
}: ReconciliationHeaderProps) {
  const { params } = result;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-600/20">
          <FileSearch className="h-6 w-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Результаты сверки</h1>
          <p className="text-slate-400 text-sm">
            {formatDate(params.dateFrom)} — {formatDate(params.dateTo)}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportReconciliationToExcel(result)}
          className="border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Экспорт Excel
        </Button>
        <Button
          onClick={onNewReconciliation}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Новая сверка
        </Button>
      </div>
    </div>
  );
}
