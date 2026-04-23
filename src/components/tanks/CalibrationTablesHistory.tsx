/**
 * Компонент истории калибровочных таблиц резервуара
 */

import { Fragment, useEffect, useState } from 'react';
import type { CalibrationTable } from '@/types/tanks';
import {
  applyCalibrationTable,
  approveCalibrationTable,
  deleteCalibrationTable,
  downloadCalibrationTable,
  getCalibrationTables,
  rejectCalibrationTable,
} from '@/services/calibrationTableService';
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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/useIsMobile';

interface CalibrationTablesHistoryProps {
  tankId: string;
  refreshKey?: number;
  onChanged?: () => void;
  highlightedTableId?: string | null;
}

type ConfirmAction = 'apply' | 'delete' | null;
type TableSourceTone = 'sensor' | 'trk' | 'manual' | 'unknown';
type HistoryFilter = 'all' | 'baseline_sensor' | 'draft_trk' | 'applied';

interface TableSourceMeta {
  label: string;
  description: string;
  tone: TableSourceTone;
}

export function CalibrationTablesHistory({
  tankId,
  refreshKey = 0,
  onChanged,
  highlightedTableId = null
}: CalibrationTablesHistoryProps) {
  const [tables, setTables] = useState<CalibrationTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>('all');
  const [expandedTableId, setExpandedTableId] = useState<string | null>(null);
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
      setTables([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, [tankId, refreshKey]);

  useEffect(() => {
    if (!highlightedTableId) {
      return;
    }

    setExpandedTableId(highlightedTableId);

    if (activeFilter !== 'all') {
      setActiveFilter('all');
      return;
    }

    const tableExists = tables.some((table) => table.id === highlightedTableId);
    if (!tableExists) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      document.getElementById(`calibration-table-${highlightedTableId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 80);

    return () => window.clearTimeout(timeoutId);
  }, [activeFilter, highlightedTableId, tables]);

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
      onChanged?.();
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
      onChanged?.();
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
      onChanged?.();
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

  const getTableSourceMeta = (table: CalibrationTable): TableSourceMeta => {
    const notes = table.creation_notes?.trim() || '';

    if (notes.includes('[baseline_sensor]')) {
      return {
        label: 'Baseline датчика',
        description: 'Восстановлена по фактическим показаниям level -> volume датчика',
        tone: 'sensor',
      };
    }

    if (notes.includes('[draft_trk_analysis]')) {
      return {
        label: 'Draft ТРК',
        description: 'Расчетная таблица по ТРК и поступлениям после аналитики',
        tone: 'trk',
      };
    }

    if (notes.length > 0) {
      return {
        label: 'Ручной расчет',
        description: 'Создана вручную из расчета или импорта без системного тега источника',
        tone: 'manual',
      };
    }

    return {
      label: 'Источник не указан',
      description: 'Старая запись без маркировки происхождения версии',
      tone: 'unknown',
    };
  };

  const getSourceBadgeClassName = (tone: TableSourceTone) => {
    switch (tone) {
      case 'sensor':
        return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
      case 'trk':
        return 'border-primary/30 bg-primary/10 text-primary dark:text-blue-300';
      case 'manual':
        return 'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300';
      case 'unknown':
      default:
        return '';
    }
  };

  const matchesFilter = (table: CalibrationTable, filter: HistoryFilter) => {
    const notes = table.creation_notes?.trim() || '';

    switch (filter) {
      case 'baseline_sensor':
        return notes.includes('[baseline_sensor]');
      case 'draft_trk':
        return notes.includes('[draft_trk_analysis]');
      case 'applied':
        return Boolean(table.applied_at) || table.is_active;
      case 'all':
      default:
        return true;
    }
  };

  const toggleExpandedTable = (tableId: string) => {
    setExpandedTableId((current) => current === tableId ? null : tableId);
  };

  const getStructuredNotes = (table: CalibrationTable) => {
    const lines = (table.creation_notes || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !/^\[[^\]]+\]$/.test(line));

    const period = lines.find((line) => line.startsWith('Период анализа:'));
    const relativeVersion = lines.find((line) => line.startsWith('Сравнение выполнялось относительно активной версии'));
    const coverage = lines.find((line) => line.startsWith('Покрытие датчика:'));
    const sensorComparison = lines.find((line) => line.startsWith('Сравнение Датчик/ТРК:'));
    const trkValidation = lines.find((line) => line.startsWith('Валидация ТРК:'));
    const operatorComment = lines.find((line) => line.startsWith('Комментарий оператора:'));
    const reasonsLine = lines.find((line) => line.startsWith('Причины:'));
    const verdictLine = lines.find((line) => line.startsWith('Verdict:'));

    let verdictStatus: string | null = null;
    let verdictTitle: string | null = null;
    let verdictDescription: string | null = null;

    if (verdictLine) {
      const verdictValue = verdictLine.replace(/^Verdict:\s*/, '');
      const firstDot = verdictValue.indexOf('.');
      const secondDot = firstDot >= 0 ? verdictValue.indexOf('.', firstDot + 1) : -1;

      if (firstDot >= 0) {
        verdictStatus = verdictValue.slice(0, firstDot).trim();
      }

      if (secondDot >= 0) {
        verdictTitle = verdictValue.slice(firstDot + 1, secondDot).trim();
        verdictDescription = verdictValue.slice(secondDot + 1).trim();
      } else if (firstDot >= 0) {
        verdictDescription = verdictValue.slice(firstDot + 1).trim();
      } else {
        verdictDescription = verdictValue.trim();
      }
    }

    const consumedLines = new Set([
      period,
      relativeVersion,
      coverage,
      sensorComparison,
      trkValidation,
      operatorComment,
      reasonsLine,
      verdictLine,
    ].filter(Boolean));

    return {
      period,
      relativeVersion,
      coverage,
      sensorComparison,
      trkValidation,
      operatorComment: operatorComment?.replace(/^Комментарий оператора:\s*/, '') || null,
      reasons: reasonsLine?.replace(/^Причины:\s*/, '').split(' | ').filter(Boolean) || [],
      verdictStatus,
      verdictTitle,
      verdictDescription,
      freeformNotes: lines.filter((line) => !consumedLines.has(line)),
    };
  };

  const getVerdictMeta = (status: string | null) => {
    switch (status) {
      case 'ready_for_approval':
        return {
          label: 'Можно на ревью',
          className: 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300',
        };
      case 'review_required':
        return {
          label: 'Нужна проверка',
          className: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
        };
      case 'insufficient_data':
        return {
          label: 'Недостаточно данных',
          className: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
        };
      default:
        return {
          label: 'Без verdict',
          className: 'border-border text-muted-foreground',
        };
    }
  };

  const renderExpandedDetails = (table: CalibrationTable) => {
    const notes = getStructuredNotes(table);
    const verdictMeta = getVerdictMeta(notes.verdictStatus);

    return (
      <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
        <div className="grid gap-3 md:grid-cols-2">
          {(notes.verdictTitle || notes.verdictDescription) && (
            <div className="rounded-md border border-border bg-background p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground">Verdict</span>
                <Badge variant="outline" className={verdictMeta.className}>
                  {notes.verdictTitle || verdictMeta.label}
                </Badge>
              </div>
              {notes.verdictDescription && (
                <p className="mt-2 text-sm text-foreground">{notes.verdictDescription}</p>
              )}
            </div>
          )}

          {table.comparison_with_previous?.has_previous && (
            <div className="rounded-md border border-border bg-background p-3 text-sm">
              <p className="text-xs font-medium text-muted-foreground">Сравнение с предыдущей версией</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-muted-foreground">Среднее изменение</span>
                  <div className="font-semibold text-foreground">
                    {table.comparison_with_previous.average_difference_percent?.toFixed(2) ?? '—'}%
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Макс. изменение</span>
                  <div className="font-semibold text-foreground">
                    {table.comparison_with_previous.max_difference_percent?.toFixed(2) ?? '—'}%
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Пиковый уровень</span>
                  <div className="font-semibold text-foreground">
                    {table.comparison_with_previous.max_difference_level_mm ?? '—'} мм
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Значимых точек</span>
                  <div className="font-semibold text-foreground">
                    {table.comparison_with_previous.points_with_significant_change ?? '—'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {(notes.period || notes.relativeVersion || notes.coverage || notes.sensorComparison || notes.trkValidation) && (
            <div className="rounded-md border border-border bg-background p-3">
              <p className="text-xs font-medium text-muted-foreground">Контекст расчета</p>
              <div className="mt-2 space-y-1.5 text-sm text-foreground">
                {notes.period && <p>{notes.period}</p>}
                {notes.relativeVersion && <p>{notes.relativeVersion}</p>}
                {notes.coverage && <p>{notes.coverage}</p>}
                {notes.sensorComparison && <p>{notes.sensorComparison}</p>}
                {notes.trkValidation && <p>{notes.trkValidation}</p>}
              </div>
            </div>
          )}

          {(table.approval_notes || table.rejection_reason || notes.operatorComment) && (
            <div className="rounded-md border border-border bg-background p-3">
              <p className="text-xs font-medium text-muted-foreground">Workflow</p>
              <div className="mt-2 space-y-2 text-sm text-foreground">
                {notes.operatorComment && (
                  <p><span className="text-muted-foreground">Комментарий оператора:</span> {notes.operatorComment}</p>
                )}
                {table.approval_notes && (
                  <p><span className="text-muted-foreground">Примечание к утверждению:</span> {table.approval_notes}</p>
                )}
                {table.rejection_reason && (
                  <p><span className="text-muted-foreground">Причина отклонения:</span> {table.rejection_reason}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {(notes.reasons.length > 0 || notes.freeformNotes.length > 0 || table.diagnostics?.warnings?.length) && (
          <div className="grid gap-3 md:grid-cols-2">
            {(notes.reasons.length > 0 || notes.freeformNotes.length > 0) && (
              <div className="rounded-md border border-border bg-background p-3">
                <p className="text-xs font-medium text-muted-foreground">Пояснения</p>
                <div className="mt-2 space-y-1.5 text-sm text-foreground">
                  {notes.reasons.length > 0 && (
                    <div>
                      <p className="text-muted-foreground">Причины verdict:</p>
                      <div className="mt-1 space-y-1">
                        {notes.reasons.map((reason, index) => (
                          <p key={`${table.id}-reason-${index}`}>{reason}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  {notes.freeformNotes.length > 0 && (
                    <div className="space-y-1">
                      {notes.freeformNotes.map((note, index) => (
                        <p key={`${table.id}-note-${index}`}>{note}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {table.diagnostics?.warnings && table.diagnostics.warnings.length > 0 && (
              <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  Предупреждения алгоритма ({table.diagnostics.warnings.length})
                </p>
                <div className="mt-2 space-y-1.5 text-sm text-amber-800 dark:text-amber-200">
                  {table.diagnostics.warnings.slice(0, 4).map((warning, index) => (
                    <p key={`${table.id}-warning-${index}`}>{warning}</p>
                  ))}
                  {table.diagnostics.warnings.length > 4 && (
                    <p className="text-xs text-amber-700/80 dark:text-amber-200/80">
                      И еще {table.diagnostics.warnings.length - 4} предупреждений.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
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

  const filterItems: Array<{ key: HistoryFilter; label: string; count: number }> = [
    { key: 'all', label: 'Все', count: tables.length },
    { key: 'baseline_sensor', label: 'Baseline датчика', count: tables.filter((table) => matchesFilter(table, 'baseline_sensor')).length },
    { key: 'draft_trk', label: 'Draft ТРК', count: tables.filter((table) => matchesFilter(table, 'draft_trk')).length },
    { key: 'applied', label: 'Примененные', count: tables.filter((table) => matchesFilter(table, 'applied')).length },
  ];

  const filteredTables = tables.filter((table) => matchesFilter(table, activeFilter));
  const highlightedTable = highlightedTableId
    ? tables.find((table) => table.id === highlightedTableId) || null
    : null;

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
      <div className="space-y-3">
        {highlightedTable && (
          <Card className="border-primary/20 bg-primary/10">
            <div className="p-3 text-sm">
              <p className="font-medium text-primary dark:text-blue-300">
                Выделена версия v{highlightedTable.version} из сводки сравнения.
              </p>
              <p className="mt-1 text-xs text-primary/80 dark:text-blue-200/80">
                Ниже подсвечена строка этой таблицы в истории.
              </p>
            </div>
          </Card>
        )}

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {filterItems.map((item) => (
              <Button
                key={item.key}
                variant={activeFilter === item.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveFilter(item.key)}
                className="h-8 rounded-full"
              >
                {item.label}
                <span className="ml-2 text-xs opacity-80">{item.count}</span>
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Показано {filteredTables.length} из {tables.length} версий
          </p>
        </div>

        {filteredTables.length === 0 ? (
          <Card>
            <div className="p-8 text-center text-muted-foreground">
              <p>По выбранному фильтру версий пока нет</p>
              <p className="text-sm mt-2">Смените фильтр или создайте новую таблицу этого типа</p>
            </div>
          </Card>
        ) : isMobile ? (
        <div className="space-y-3">
          {filteredTables.map((table) => {
            const sourceMeta = getTableSourceMeta(table);
            const isExpanded = expandedTableId === table.id;

            return (
              <Card
                key={table.id}
                id={`calibration-table-${table.id}`}
                className={`${table.is_active ? 'bg-card/50' : ''} ${table.id === highlightedTableId ? 'ring-2 ring-primary/40 border-primary/40' : ''}`}
              >
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">v{table.version}</span>
                        {table.is_active && <Badge variant="default" className="text-xs">Активна</Badge>}
                        {getStatusBadge(table.status)}
                        <Badge variant="outline" className={`text-xs ${getSourceBadgeClassName(sourceMeta.tone)}`}>
                          {sourceMeta.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {sourceMeta.description}
                      </p>
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
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpandedTable(table.id)}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-2" />
                          Скрыть детали
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-2" />
                          Подробнее
                        </>
                      )}
                    </Button>
                  </div>
                  {isExpanded && (
                    <div className="mt-3">
                      {renderExpandedDetails(table)}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
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
                {filteredTables.map((table) => {
                  const sourceMeta = getTableSourceMeta(table);
                  const isExpanded = expandedTableId === table.id;

                  return (
                    <Fragment key={table.id}>
                      <TableRow
                        id={`calibration-table-${table.id}`}
                        className={`${table.is_active ? 'bg-card/50' : ''} ${table.id === highlightedTableId ? 'bg-primary/10' : ''}`}
                      >
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold">v{table.version}</span>
                              {table.is_active && (
                                <Badge variant="default" className="text-xs">Активна</Badge>
                              )}
                              <Badge variant="outline" className={`text-xs ${getSourceBadgeClassName(sourceMeta.tone)}`}>
                                {sourceMeta.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground max-w-64">
                              {sourceMeta.description}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => toggleExpandedTable(table.id)}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-4 h-4 mr-2" />
                                  Скрыть детали
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4 mr-2" />
                                  Подробнее
                                </>
                              )}
                            </Button>
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
                      {isExpanded && (
                        <TableRow className={table.id === highlightedTableId ? 'bg-primary/5' : ''}>
                          <TableCell colSpan={6}>
                            {renderExpandedDetails(table)}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
      </div>
    </>
  );
}
