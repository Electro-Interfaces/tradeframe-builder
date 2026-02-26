/**
 * Компонент истории калибровочных таблиц резервуара
 */

import { useEffect, useState } from 'react';
import { CalibrationTable } from '@/types/tanks';
import { getCalibrationTables, downloadCalibrationTable, applyCalibrationTable, approveCalibrationTable, rejectCalibrationTable, deleteCalibrationTable } from '@/services/calibrationTableService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Download,
  MoreVertical,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Trash2,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/useIsMobile';

interface CalibrationTablesHistoryProps {
  tankId: string;
}

export function CalibrationTablesHistory({ tankId }: CalibrationTablesHistoryProps) {
  const [tables, setTables] = useState<CalibrationTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const loadTables = async () => {
    try {
      setIsLoading(true);
      const data = await getCalibrationTables(tankId);
      setTables(data);
    } catch (error) {
      console.error('Failed to load calibration tables:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, [tankId]);

  const handleDownload = async (tableId: string, format: 'csv' | 'json') => {
    try {
      setActionInProgress(tableId);
      await downloadCalibrationTable(tableId, format);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleApprove = async (tableId: string) => {
    try {
      setActionInProgress(tableId);
      await approveCalibrationTable(tableId);
      await loadTables();
    } catch (error) {
      console.error('Approve failed:', error);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (tableId: string) => {
    const reason = prompt('Укажите причину отклонения:');
    if (!reason) return;

    try {
      setActionInProgress(tableId);
      await rejectCalibrationTable(tableId, reason);
      await loadTables();
    } catch (error) {
      console.error('Reject failed:', error);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleApply = async (tableId: string) => {
    if (!confirm('Применить эту калибровочную таблицу? Она станет активной для резервуара.')) {
      return;
    }

    try {
      setActionInProgress(tableId);
      await applyCalibrationTable(tableId);
      await loadTables();
    } catch (error) {
      console.error('Apply failed:', error);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (tableId: string) => {
    if (!confirm('Удалить эту калибровочную таблицу?')) {
      return;
    }

    try {
      setActionInProgress(tableId);
      await deleteCalibrationTable(tableId);
      await loadTables();
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setActionInProgress(null);
    }
  };

  const getStatusBadge = (status: CalibrationTable['status']) => {
    const variants = {
      draft: { variant: 'outline' as const, label: 'Черновик' },
      pending_approval: { variant: 'secondary' as const, label: 'На утверждении' },
      approved: { variant: 'default' as const, label: 'Утверждена' },
      rejected: { variant: 'destructive' as const, label: 'Отклонена' },
      archived: { variant: 'outline' as const, label: 'Архив' },
    };

    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="text-center p-8 text-slate-400">
        <p>Калибровочные таблицы еще не создавались</p>
        <p className="text-sm mt-2">Используйте раздел "Расчет таблицы" для создания первой таблицы</p>
      </div>
    );
  }

  const TableActions = ({ table: t }: { table: CalibrationTable }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={actionInProgress === t.id}>
          {actionInProgress === t.id ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <MoreVertical className="w-4 h-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleDownload(t.id, 'csv')}>
          <Download className="w-4 h-4 mr-2" />
          Скачать CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload(t.id, 'json')}>
          <Download className="w-4 h-4 mr-2" />
          Скачать JSON
        </DropdownMenuItem>
        {t.status === 'draft' && (
          <>
            <DropdownMenuItem onClick={() => handleApprove(t.id)}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Утвердить
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleReject(t.id)}>
              <XCircle className="w-4 h-4 mr-2" />
              Отклонить
            </DropdownMenuItem>
          </>
        )}
        {t.status === 'approved' && !t.is_active && (
          <DropdownMenuItem onClick={() => handleApply(t.id)}>
            <PlayCircle className="w-4 h-4 mr-2" />
            Применить
          </DropdownMenuItem>
        )}
        {!t.is_active && t.status !== 'approved' && (
          <DropdownMenuItem onClick={() => handleDelete(t.id)} className="text-red-400">
            <Trash2 className="w-4 h-4 mr-2" />
            Удалить
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (isMobile) {
    return (
      <div className="space-y-3">
        {tables.map((table) => (
          <Card key={table.id} className={table.is_active ? 'bg-slate-800/50' : ''}>
            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">v{table.version}</span>
                  {table.is_active && <Badge variant="default" className="text-xs">Активна</Badge>}
                  {getStatusBadge(table.status)}
                </div>
                <TableActions table={table} />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                <div>
                  <span className="text-slate-400 text-xs">Период</span>
                  <div>{format(new Date(table.analysis_start_date), 'dd.MM.yy', { locale: ru })} — {format(new Date(table.analysis_end_date), 'dd.MM.yy', { locale: ru })}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-xs">Создана</span>
                  <div>{format(new Date(table.created_at), 'dd.MM.yy HH:mm', { locale: ru })}</div>
                </div>
                {table.statistics && (
                  <>
                    <div>
                      <span className="text-slate-400 text-xs">Точек</span>
                      <div className="font-semibold">{table.statistics.data_points_used}</div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs">R²</span>
                      <div className="font-semibold">{table.statistics.r_squared?.toFixed(3)}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Версия</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Период анализа</TableHead>
              <TableHead>Статистика</TableHead>
              <TableHead>Создана</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tables.map((table) => (
              <TableRow key={table.id} className={table.is_active ? 'bg-slate-800/50' : ''}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">v{table.version}</span>
                    {table.is_active && (
                      <Badge variant="default" className="text-xs">Активна</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(table.status)}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{format(new Date(table.analysis_start_date), 'dd.MM.yyyy', { locale: ru })}</div>
                    <div className="text-slate-400">
                      {format(new Date(table.analysis_end_date), 'dd.MM.yyyy', { locale: ru })}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {table.statistics && (
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-400">Точек:</span>
                        <span className="font-semibold">{table.statistics.data_points_used}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-400">R²:</span>
                        <span className="font-semibold">{table.statistics.r_squared?.toFixed(3)}</span>
                      </div>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {format(new Date(table.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <TableActions table={table} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
