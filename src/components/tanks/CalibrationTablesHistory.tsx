/**
 * Компонент истории калибровочных таблиц резервуара
 */

import { useEffect, useState } from 'react';
import { CalibrationTable } from '@/types/tanks';
import { getCalibrationTables, downloadCalibrationTable, applyCalibrationTable, approveCalibrationTable, rejectCalibrationTable, deleteCalibrationTable } from '@/services/calibrationTableService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

type ConfirmAction = 'apply' | 'delete' | null;

export function CalibrationTablesHistory({ tankId }: CalibrationTablesHistoryProps) {
  const [tables, setTables] = useState<CalibrationTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Состояние для AlertDialog (apply / delete)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [confirmTableId, setConfirmTableId] = useState<string | null>(null);

  // Состояние для Dialog с вводом причины (reject)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTableId, setRejectTableId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadTables = async () => {
    try {
      setIsLoading(true);
      const data = await getCalibrationTables(tankId);
      setTables(data);
    } catch {
      // Бэкенд-эндпоинт не реализован — таблицы не загрузятся
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, [tankId]);

  const handleDownload = async (tableId: string, fmt: 'csv' | 'json') => {
    try {
      setActionInProgress(tableId);
      await downloadCalibrationTable(tableId, fmt);
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

  // Открываем Dialog для ввода причины отклонения
  const openRejectDialog = (tableId: string) => {
    setRejectTableId(tableId);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectTableId || !rejectReason.trim()) return;
    setRejectDialogOpen(false);
    try {
      setActionInProgress(rejectTableId);
      await rejectCalibrationTable(rejectTableId, rejectReason.trim());
      await loadTables();
    } catch (error) {
      console.error('Reject failed:', error);
    } finally {
      setActionInProgress(null);
      setRejectTableId(null);
      setRejectReason('');
    }
  };

  // Открываем AlertDialog для подтверждения apply / delete
  const openConfirmDialog = (action: ConfirmAction, tableId: string) => {
    setConfirmAction(action);
    setConfirmTableId(tableId);
  };

  const handleConfirmAction = async () => {
    if (!confirmTableId || !confirmAction) return;
    const action = confirmAction;
    const tableId = confirmTableId;
    setConfirmAction(null);
    setConfirmTableId(null);

    try {
      setActionInProgress(tableId);
      if (action === 'apply') {
        await applyCalibrationTable(tableId);
      } else if (action === 'delete') {
        await deleteCalibrationTable(tableId);
      }
      await loadTables();
    } catch (error) {
      console.error(`${action} failed:`, error);
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
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <p>Калибровочные таблицы еще не создавались</p>
        <p className="text-sm mt-2">Используйте раздел "Расчет таблицы" для создания первой таблицы</p>
      </div>
    );
  }

  const confirmMessages: Record<string, { title: string; description: string }> = {
    apply: {
      title: 'Применить калибровочную таблицу?',
      description: 'Таблица станет активной для резервуара. Предыдущая активная таблица будет заменена.',
    },
    delete: {
      title: 'Удалить калибровочную таблицу?',
      description: 'Это действие необратимо. Таблица будет удалена из истории.',
    },
  };

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
            <DropdownMenuItem onClick={() => openRejectDialog(t.id)}>
              <XCircle className="w-4 h-4 mr-2" />
              Отклонить
            </DropdownMenuItem>
          </>
        )}
        {t.status === 'approved' && !t.is_active && (
          <DropdownMenuItem onClick={() => openConfirmDialog('apply', t.id)}>
            <PlayCircle className="w-4 h-4 mr-2" />
            Применить
          </DropdownMenuItem>
        )}
        {!t.is_active && t.status !== 'approved' && (
          <DropdownMenuItem onClick={() => openConfirmDialog('delete', t.id)} className="text-red-600 dark:text-red-400">
            <Trash2 className="w-4 h-4 mr-2" />
            Удалить
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      {/* AlertDialog для подтверждения apply/delete */}
      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => { if (!open) { setConfirmAction(null); setConfirmTableId(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction ? confirmMessages[confirmAction].title : ''}</AlertDialogTitle>
            <AlertDialogDescription>{confirmAction ? confirmMessages[confirmAction].description : ''}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              {confirmAction === 'delete' ? 'Удалить' : 'Применить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog для ввода причины отклонения */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отклонение калибровочной таблицы</DialogTitle>
            <DialogDescription>Укажите причину отклонения таблицы.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reject-reason">Причина отклонения</Label>
            <Input
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Укажите причину..."
              className="mt-2"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Отмена</Button>
            <Button variant="destructive" onClick={handleRejectConfirm} disabled={!rejectReason.trim()}>
              Отклонить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Контент */}
      {isMobile ? (
        <div className="space-y-3">
          {tables.map((table) => (
            <Card key={table.id} className={table.is_active ? 'bg-card/50' : ''}>
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
                    <span className="text-muted-foreground text-xs">Период</span>
                    <div>{format(new Date(table.analysis_start_date), 'dd.MM.yy', { locale: ru })} — {format(new Date(table.analysis_end_date), 'dd.MM.yy', { locale: ru })}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Создана</span>
                    <div>{format(new Date(table.created_at), 'dd.MM.yy HH:mm', { locale: ru })}</div>
                  </div>
                  {table.statistics && (
                    <>
                      <div>
                        <span className="text-muted-foreground text-xs">Точек</span>
                        <div className="font-semibold">{table.statistics.data_points_used}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">R²</span>
                        <div className="font-semibold">{table.statistics.r_squared?.toFixed(3)}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
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
                  <TableRow key={table.id} className={table.is_active ? 'bg-card/50' : ''}>
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
                        <div className="text-muted-foreground">
                          {format(new Date(table.analysis_end_date), 'dd.MM.yyyy', { locale: ru })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {table.statistics && (
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Точек:</span>
                            <span className="font-semibold">{table.statistics.data_points_used}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">R²:</span>
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
      )}
    </>
  );
}
