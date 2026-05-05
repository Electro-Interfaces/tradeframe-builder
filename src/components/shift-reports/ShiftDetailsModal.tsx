import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Clock, AlertTriangle, FileDown } from "lucide-react";
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { ShiftDetails } from '@/types/shift-reports-v2';
import { shiftReportsV2Service } from '@/services/shiftReportsV2Service';
import { ExportDialog } from './ExportDialog';
import { exportShiftReport, type ExportFormat, type ExportMode } from '@/services/shiftReportExportService';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { isCashOrCard } from '@/utils/paymentUtils';
import { getShiftStatusBadgeClass, getShiftStatusConfig } from './shiftStatus';

interface ShiftDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftNumber: number | null;
  system: number;
  station: number;
  stationName?: string;
}

const ShiftDetailsModal: React.FC<ShiftDetailsModalProps> = ({
  isOpen,
  onClose,
  shiftNumber,
  system,
  station,
  stationName,
}) => {
  const [details, setDetails] = useState<ShiftDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // CSS классы для таблиц
  const thClass = isMobile ? 'px-1 py-1' : 'px-2 py-2';
  const tdClass = isMobile ? 'px-1 py-1' : 'px-3 py-2';

  useEffect(() => {
    if (isOpen && shiftNumber !== null) {
      loadShiftDetails();
    }
  }, [isOpen, shiftNumber, station, system]);

  const loadShiftDetails = async () => {
    if (shiftNumber === null) return;

    try {
      setLoading(true);
      setError(null);

      const data = await shiftReportsV2Service.getShiftDetails(
        {
          system,
          station,
          shift: shiftNumber,
        },
        stationName
      );

      setDetails(data);
    } catch (err) {
      console.error('Ошибка загрузки деталей смены:', err);
      setError('Не удалось загрузить детали смены');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' ₽';
  };

  const formatVolume = (value: number) => {
    return value.toFixed(2) + ' л';
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: ru });
  };

  const handleExport = async (format: ExportFormat, mode: ExportMode, folderHandle?: any) => {
    if (!details) {
      toast({
        title: "Ошибка",
        description: "Нет данных для экспорта",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      const result = await exportShiftReport(details, { format, mode, folderHandle });

      if (result.success) {
        if (result.skipped) {
          toast({
            title: "Файл уже существует",
            description: `Файл ${result.fileName} уже был экспортирован ранее`,
          });
        } else {
          toast({
            title: "Экспорт завершен",
            description: `Файл ${result.fileName} успешно сохранен`,
          });
        }
      } else {
        toast({
          title: "Ошибка экспорта",
          description: result.error || "Неизвестная ошибка",
          variant: "destructive",
        });
      }

      setExportDialogOpen(false);
    } catch (error) {
      console.error('❌ Ошибка экспорта:', error);
      toast({
        title: "Ошибка экспорта",
        description: error instanceof Error ? error.message : "Неизвестная ошибка",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] bg-card border-border flex flex-col">
        <DialogHeader>
          <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-start justify-between'}`}>
            <div className="flex-1 mr-10">
              <div className="flex items-center justify-between">
                <DialogTitle className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-foreground flex ${isMobile ? 'flex-col gap-2' : 'items-center gap-3'}`}>
                  <span>Детали смены #{shiftNumber}</span>
                  {details && (() => {
                    const status = getShiftStatusConfig(details.status, details.openedAt, details.hasDiscrepancies);
                    const StatusIcon = status.icon;
                    return (
                      <Badge className={`${getShiftStatusBadgeClass(status.tone)} flex items-center gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </Badge>
                    );
                  })()}
                </DialogTitle>
                {details && !isMobile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExportDialogOpen(true)}
                    disabled={isExporting}
                    className=" mr-2"
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Экспорт
                  </Button>
                )}
              </div>
              {stationName && (
                <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'} mt-1`}>{stationName}</p>
              )}
            </div>
            {details && isMobile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportDialogOpen(true)}
                disabled={isExporting}
                className="w-full "
              >
                <FileDown className="h-4 w-4 mr-2" />
                Экспорт
              </Button>
            )}
          </div>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">Загрузка деталей смены...</div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-16">
            <div className="text-red-600 dark:text-red-400">{error}</div>
          </div>
        )}

        {details && !loading && !error && (
          <div className={`${isMobile ? 'space-y-2' : 'space-y-4'} flex-1 overflow-y-auto`}>
            {/* Основная информация */}
            <div className={`grid grid-cols-1 md:grid-cols-4 ${isMobile ? 'gap-1.5' : 'gap-2'}`}>
              <div className={`bg-secondary/50 rounded-lg ${isMobile ? 'p-1.5' : 'p-2.5'}`}>
                <div className={`text-muted-foreground ${isMobile ? 'text-[10px]' : 'text-xs'} mb-0.5`}>Статус</div>
                <div className={isMobile ? 'mt-0.5' : 'mt-1'}>
                  {(() => {
                    const status = getShiftStatusConfig(details.status, details.openedAt, details.hasDiscrepancies);
                    const StatusIcon = status.icon;
                    return (
                      <Badge className={`${getShiftStatusBadgeClass(status.tone)} flex items-center gap-1 w-fit ${isMobile ? 'text-xs' : ''}`}>
                        <StatusIcon className={isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
                        {status.label}
                      </Badge>
                    );
                  })()}
                </div>
              </div>
              <div className={`bg-secondary/50 rounded-lg ${isMobile ? 'p-1.5' : 'p-2.5'}`}>
                <div className={`text-muted-foreground ${isMobile ? 'text-[10px]' : 'text-xs'} mb-0.5`}>Открыта</div>
                <div className={`text-foreground font-semibold ${isMobile ? 'text-xs' : 'text-sm'}`}>{formatDateTime(details.openedAt)}</div>
              </div>
              <div className={`bg-secondary/50 rounded-lg ${isMobile ? 'p-1.5' : 'p-2.5'}`}>
                <div className={`text-muted-foreground ${isMobile ? 'text-[10px]' : 'text-xs'} mb-0.5`}>Закрыта</div>
                <div className={`text-foreground font-semibold ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  {details.closedAt ? formatDateTime(details.closedAt) : '—'}
                </div>
              </div>
              <div className={`bg-secondary/50 rounded-lg ${isMobile ? 'p-1.5' : 'p-2.5'}`}>
                <div className={`text-muted-foreground ${isMobile ? 'text-[10px]' : 'text-xs'} mb-0.5`}>Оператор</div>
                <div className={`text-foreground font-semibold ${isMobile ? 'text-xs' : 'text-sm'}`}>{details.operator}</div>
              </div>
            </div>

            {/* Вкладки с детальной информацией */}
            <Tabs defaultValue="composition" className="w-full">
              <TabsList className={`bg-secondary w-full justify-start overflow-x-auto ${isMobile ? 'h-auto' : ''}`}>
                <TabsTrigger value="composition" className={`font-medium data-[state=active]:bg-secondary data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:shadow-sm ${isMobile ? 'text-xs px-2 py-1.5' : 'px-4 py-2'}`}>
                  {isMobile ? 'Состав' : 'Состав смены'}
                </TabsTrigger>
                <TabsTrigger value="tanks" className={`font-medium data-[state=active]:bg-secondary data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:shadow-sm ${isMobile ? 'text-xs px-2 py-1.5' : 'px-4 py-2'}`}>
                  {isMobile ? 'Резервуары' : 'Состояние резервуаров'}
                </TabsTrigger>
                <TabsTrigger value="receipts" className={`font-medium data-[state=active]:bg-secondary data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:shadow-sm ${isMobile ? 'text-xs px-2 py-1.5' : 'px-4 py-2'}`}>
                  Поступления
                </TabsTrigger>
                <TabsTrigger value="sales" className={`font-medium data-[state=active]:bg-secondary data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:shadow-sm ${isMobile ? 'text-xs px-2 py-1.5' : 'px-4 py-2'}`}>
                  {isMobile ? 'Реализация' : 'Расшифровка реализации'}
                </TabsTrigger>
                <TabsTrigger value="cash" className={`font-medium data-[state=active]:bg-secondary data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:shadow-sm ${isMobile ? 'text-xs px-2 py-1.5' : 'px-4 py-2'}`}>
                  {isMobile ? 'Наличные' : 'Движение наличных'}
                </TabsTrigger>
              </TabsList>

              {/* Состав смены - Показания счетных механизмов */}
              <TabsContent value="composition" className={isMobile ? 'mt-2' : 'mt-4'}>
                <div className={`${isMobile ? 'mb-2' : 'mb-4'} text-foreground/80`}>
                  <p className={isMobile ? 'text-xs' : ''}>Смена с {details.openedAt ? formatDateTime(details.openedAt) : '—'} до {details.closedAt ? formatDateTime(details.closedAt) : '—'}</p>
                </div>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className={`w-full border-collapse ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    <thead className="bg-secondary/80">
                      <tr className="border-b-2 border-border">
                        <th className={`${thClass} text-left text-foreground border-r-2 border-border`} rowSpan={4}>{isMobile ? 'Топливо' : 'Наименование нефтепродуктов'}</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={4}>{isMobile ? 'Рез.' : 'N Резервуара'}</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={4}>{isMobile ? 'Пл.' : 'Плотн кг/м3'}</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} colSpan={5}>{isMobile ? 'Показания ТРК' : 'Показание счетных механизмов'}</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={4}>{isMobile ? 'Цена' : 'Цена за литр руб.'}</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={4}>{isMobile ? 'Сумма' : 'Сумма, руб.'}</th>
                        <th className={`${thClass} text-center text-foreground`} colSpan={2}>{isMobile ? 'Погр.' : 'Погрешность ТРК'}</th>
                      </tr>
                      <tr className="border-b-2 border-border">
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={3}>№ ТРК</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={3}>{isMobile ? 'Кон.' : 'на конец смены л'}</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={3}>{isMobile ? 'Нач.' : 'на начало смены л'}</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} colSpan={2}>расход</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={3}>{isMobile ? '%' : 'проц.'}</th>
                        <th className={`${thClass} text-center text-foreground`} rowSpan={3}>л</th>
                      </tr>
                      <tr className="border-b-2 border-border">
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={2}>л</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={2}>кг</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card">
                      {details.fuelSales.map((fuel, idx) => {
                        const tank = details.tanks.find(t => t.fuelCode === fuel.fuelCode);
                        const nozzles = details.nozzleReadings.filter(n => n.fuelCode === fuel.fuelCode);

                        // Вычисляем суммы для строки "Всего:"
                        const totalStartCounter = nozzles.reduce((sum, n) => sum + n.startCounter, 0);
                        const totalEndCounter = nozzles.reduce((sum, n) => sum + n.endCounter, 0);
                        const totalVolume = nozzles.reduce((sum, n) => sum + n.volume, 0);
                        const totalAmount = nozzles.reduce((sum, n) => sum + n.amount, 0);
                        const totalCost = nozzles.reduce((sum, n) => sum + n.cost, 0);

                        return (
                          <React.Fragment key={fuel.fuelCode}>
                            {/* Строки с данными по каждому пистолету ТРК */}
                            {nozzles.map((nozzle, nIdx) => (
                              <tr key={`${fuel.fuelCode}-${nozzle.nozzle}`} className="border-b border-border">
                                {nIdx === 0 ? (
                                  <>
                                    <td className={`${tdClass} text-foreground font-medium border-r-2 border-border`} rowSpan={nozzles.length + 1}>
                                      {fuel.fuelName}
                                    </td>
                                    <td className={`${tdClass} text-center text-foreground border-r-2 border-border`} rowSpan={nozzles.length + 1}>
                                      {tank?.tankNumber || '—'}
                                    </td>
                                    <td className={`${tdClass} text-center text-foreground border-r-2 border-border`} rowSpan={1}>
                                      {nozzle.density ? nozzle.density.toFixed(1) : '—'}
                                    </td>
                                  </>
                                ) : (
                                  <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}></td>
                                )}
                                <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{nozzle.nozzle}</td>
                                <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{nozzle.endCounter.toFixed(2)}</td>
                                <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{nozzle.startCounter.toFixed(2)}</td>
                                <td className={`${tdClass} text-center text-foreground font-medium border-r-2 border-border`}>{nozzle.volume.toFixed(2)}</td>
                                <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{nozzle.amount.toFixed(2)}</td>
                                <td className={`${tdClass} text-center text-foreground font-medium border-r-2 border-border`}>{nozzle.price.toFixed(2)}</td>
                                <td className={`${tdClass} text-right text-foreground font-medium border-r-2 border-border`}>{formatCurrency(nozzle.cost)}</td>
                                <td className={`${tdClass} text-center text-muted-foreground border-r-2 border-border`}>0.00</td>
                                <td className={`${tdClass} text-center text-muted-foreground`}>0.000</td>
                              </tr>
                            ))}
                            {/* Строка "Всего:" */}
                            <tr className="border-b-2 border-border bg-secondary/50">
                              <td className={`${tdClass} text-foreground font-bold`}>Всего:</td>
                              <td className={`${tdClass} border-r-2 border-border`}></td>
                              <td className={`${tdClass} text-center text-foreground font-bold border-r-2 border-border`}>{totalEndCounter.toFixed(2)}</td>
                              <td className={`${tdClass} text-center text-foreground font-bold border-r-2 border-border`}>{totalStartCounter.toFixed(2)}</td>
                              <td className={`${tdClass} text-center text-foreground font-bold border-r-2 border-border`}>{totalVolume.toFixed(2)}</td>
                              <td className={`${tdClass} text-center text-foreground font-bold border-r-2 border-border`}>{totalAmount.toFixed(2)}</td>
                              <td className={`${tdClass} border-r-2 border-border`}></td>
                              <td className={`${tdClass} text-right text-foreground font-bold border-r-2 border-border`}>{formatCurrency(totalCost)}</td>
                              <td className={`${tdClass} border-r-2 border-border`}></td>
                              <td className={tdClass}></td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                      {/* Строка "ИТОГО:" для всей таблицы */}
                      <tr className="border-t-2 border-border bg-secondary">
                        <td className={`${tdClass} text-foreground font-bold text-lg`}>ИТОГО:</td>
                        <td className={`${tdClass} border-r-2 border-border`}></td>
                        <td className={`${tdClass} border-r-2 border-border`}></td>
                        <td className={`${tdClass} border-r-2 border-border`}></td>
                        <td className={`${tdClass} text-center text-foreground font-bold border-r-2 border-border`}>
                          {details.nozzleReadings.reduce((sum, n) => sum + n.endCounter, 0).toFixed(2)}
                        </td>
                        <td className={`${tdClass} text-center text-foreground font-bold border-r-2 border-border`}>
                          {details.nozzleReadings.reduce((sum, n) => sum + n.startCounter, 0).toFixed(2)}
                        </td>
                        <td className={`${tdClass} text-center text-foreground font-bold border-r-2 border-border`}>
                          {details.nozzleReadings.reduce((sum, n) => sum + n.volume, 0).toFixed(2)}
                        </td>
                        <td className={`${tdClass} text-center text-foreground font-bold border-r-2 border-border`}>
                          {details.nozzleReadings.reduce((sum, n) => sum + n.amount, 0).toFixed(2)}
                        </td>
                        <td className={`${tdClass} border-r-2 border-border`}></td>
                        <td className={`${tdClass} text-right text-foreground font-bold border-r-2 border-border`}>
                          {formatCurrency(details.nozzleReadings.reduce((sum, n) => sum + n.cost, 0))}
                        </td>
                        <td className={`${tdClass} border-r-2 border-border`}></td>
                        <td className={tdClass}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  <p>* Погрешность ТРК недоступна в текущей версии API</p>
                </div>
              </TabsContent>

              {/* Показания счетных механизмов (ТРК) - placeholder */}
              {/* Продажи по топливу → переименовано в Расшифровка реализации */}
              <TabsContent value="sales" className={isMobile ? 'mt-2' : 'mt-4'}>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground text-center">
                    Расшифровка реализации
                  </h3>
                </div>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className={`w-full border-collapse ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    <thead className="bg-secondary/80">
                      {/* Первый уровень заголовков */}
                      <tr className="border-b-2 border-border">
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} colSpan={2} rowSpan={2}>Нефтепродукты, товары</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={2}>Прокачка<br/>л.</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} colSpan={2}>По картам</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={2}>Скидка<br/>руб.</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} colSpan={2}>За наличные</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={2}>Безнал.<br/>л.</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={2}>Всего<br/>л.</th>
                        <th className={`${thClass} text-center text-foreground`} rowSpan={2}>Разница<br/>л.</th>
                      </tr>
                      {/* Второй уровень заголовков */}
                      <tr className="border-b-2 border-border">
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}>л.</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}>руб.</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}>л.</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}>руб.</th>
                      </tr>
                      {/* Третий уровень - подзаголовки */}
                      <tr className="border-b-2 border-border">
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}>Наименование</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}>Код</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}></th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}></th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}></th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}></th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}></th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}></th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}></th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}></th>
                        <th className={`${thClass} text-center text-foreground`}></th>
                      </tr>
                    </thead>
                    <tbody className="bg-card">
                      {details.salesBreakdown.map((item, idx) => (
                        <tr key={idx} className="border-b border-border">
                          <td className={`${tdClass} text-foreground font-medium border-r-2 border-border`}>{item.fuelName}</td>
                          <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{item.fuelCode}</td>
                          <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{item.pumpVolume.toFixed(2)}</td>
                          <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{item.cardVolume.toFixed(2)}</td>
                          <td className={`${tdClass} text-right text-foreground border-r-2 border-border`}>{formatCurrency(item.cardCost)}</td>
                          <td className={`${tdClass} text-right text-foreground border-r-2 border-border`}>{item.discountCost.toFixed(2)}</td>
                          <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{item.cashVolume.toFixed(2)}</td>
                          <td className={`${tdClass} text-right text-foreground border-r-2 border-border`}>{formatCurrency(item.cashCost)}</td>
                          <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{item.nonCashVolume.toFixed(2)}</td>
                          <td className={`${tdClass} text-center text-foreground font-medium border-r-2 border-border`}>{item.totalVolume.toFixed(2)}</td>
                          <td className={`${tdClass} text-center text-foreground`}>{item.difference.toFixed(2)}</td>
                        </tr>
                      ))}
                      {/* Строка "Всего:" */}
                      <tr className="border-t-2 border-border bg-secondary/50">
                        <td className={`${tdClass} text-foreground font-bold`} colSpan={2}>Всего:</td>
                        <td className={`${tdClass} text-center text-foreground font-bold border-r-2 border-border`}>
                          {details.salesBreakdown.reduce((sum, item) => sum + item.pumpVolume, 0).toFixed(2)}
                        </td>
                        <td className={`${tdClass} text-center text-foreground font-bold border-r-2 border-border`}>
                          {details.salesBreakdown.reduce((sum, item) => sum + item.cardVolume, 0).toFixed(2)}
                        </td>
                        <td className={`${tdClass} text-right text-foreground font-bold border-r-2 border-border`}>
                          {formatCurrency(details.salesBreakdown.reduce((sum, item) => sum + item.cardCost, 0))}
                        </td>
                        <td className={`${tdClass} text-right text-foreground font-bold border-r-2 border-border`}>
                          {details.salesBreakdown.reduce((sum, item) => sum + item.discountCost, 0).toFixed(2)}
                        </td>
                        <td className={`${tdClass} text-center text-foreground font-bold border-r-2 border-border`}>
                          {details.salesBreakdown.reduce((sum, item) => sum + item.cashVolume, 0).toFixed(2)}
                        </td>
                        <td className={`${tdClass} text-right text-foreground font-bold border-r-2 border-border`}>
                          {formatCurrency(details.salesBreakdown.reduce((sum, item) => sum + item.cashCost, 0))}
                        </td>
                        <td className={`${tdClass} text-center text-foreground font-bold border-r-2 border-border`}>
                          {details.salesBreakdown.reduce((sum, item) => sum + item.nonCashVolume, 0).toFixed(2)}
                        </td>
                        <td className={`${tdClass} text-center text-foreground font-bold border-r-2 border-border`}>
                          {details.salesBreakdown.reduce((sum, item) => sum + item.totalVolume, 0).toFixed(2)}
                        </td>
                        <td className={`${tdClass} text-center text-foreground font-bold`}>
                          {details.salesBreakdown.reduce((sum, item) => sum + item.difference, 0).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Таблица безналичной реализации (динамическая) */}
                <div className="mt-8">
                  <h4 className="text-md font-semibold text-foreground mb-3 text-center">Безналичная реализация</h4>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    {(() => {
                      // Динамическое обнаружение всех безналичных типов оплаты из salesRaw
                      const salesRaw = (details as any).salesRaw || [];

                      // isCashOrCard импортирован из paymentUtils

                      // 1. Собираем уникальные безналичные типы оплаты (в порядке появления)
                      const paymentTypesSet = new Map<string, string>(); // lowercase → original name
                      salesRaw.forEach((sale: any) => {
                        const payName = sale.pay_type?.name || '';
                        if (payName && !isCashOrCard(payName)) {
                          const key = payName.toLowerCase().trim();
                          if (!paymentTypesSet.has(key)) {
                            paymentTypesSet.set(key, payName);
                          }
                        }
                      });

                      const paymentTypes = Array.from(paymentTypesSet.entries()); // [[key, displayName], ...]

                      // 2. Группируем: fuelCode → { fuelName, volumes по каждому типу }
                      const fuelGroups = new Map<number, {
                        fuelCode: number;
                        fuelName: string;
                        byPayType: Record<string, number>; // key → volume
                      }>();

                      salesRaw.forEach((sale: any) => {
                        const payName = sale.pay_type?.name || '';
                        const payKey = payName.toLowerCase().trim();
                        if (!payName || isCashOrCard(payName)) return;

                        sale.fuel?.forEach((fuelItem: any) => {
                          const fuelCode = fuelItem.service?.service_code || 0;
                          const fuelName = fuelItem.service?.service_name || 'Неизвестно';
                          const volume = Math.abs(parseFloat(fuelItem.release?.volume || '0'));

                          if (!fuelGroups.has(fuelCode)) {
                            fuelGroups.set(fuelCode, { fuelCode, fuelName, byPayType: {} });
                          }
                          const group = fuelGroups.get(fuelCode)!;
                          group.byPayType[payKey] = (group.byPayType[payKey] || 0) + volume;
                        });
                      });

                      const rows = Array.from(fuelGroups.values());

                      // 3. Итоги по каждому типу
                      const totals: Record<string, number> = {};
                      paymentTypes.forEach(([key]) => { totals[key] = 0; });
                      rows.forEach(row => {
                        paymentTypes.forEach(([key]) => {
                          totals[key] += row.byPayType[key] || 0;
                        });
                      });
                      const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);

                      if (paymentTypes.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">Нет данных о безналичной реализации</p>;

                      // Мобильная версия — карточки по видам топлива
                      if (isMobile) {
                        return (
                          <div className="space-y-2">
                            {rows.map((row, idx) => {
                              const rowTotal = paymentTypes.reduce((s, [key]) => s + (row.byPayType[key] || 0), 0);
                              return (
                                <div key={idx} className="bg-card rounded-lg border border-border p-2.5">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-foreground font-medium text-sm">{row.fuelName}</span>
                                    <span className="text-muted-foreground text-xs">код {row.fuelCode}</span>
                                  </div>
                                  <div className="space-y-1">
                                    {paymentTypes.map(([key, name]) => {
                                      const vol = row.byPayType[key] || 0;
                                      if (vol === 0) return null;
                                      return (
                                        <div key={key} className="flex items-center justify-between text-xs">
                                          <span className="text-muted-foreground">{name}</span>
                                          <span className="text-foreground">{vol.toFixed(2)} л.</span>
                                        </div>
                                      );
                                    })}
                                    <div className="flex items-center justify-between text-xs border-t border-border pt-1 mt-1">
                                      <span className="text-foreground/80 font-medium">Итого б/н</span>
                                      <span className="text-foreground font-bold">{rowTotal.toFixed(2)} л.</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            {/* Общий итог */}
                            <div className="bg-secondary/50 rounded-lg border border-border p-2.5">
                              <div className="space-y-1">
                                {paymentTypes.map(([key, name]) => (
                                  <div key={key} className="flex items-center justify-between text-xs">
                                    <span className="text-foreground/80 font-medium">{name}</span>
                                    <span className="text-foreground font-bold">{totals[key].toFixed(2)} л.</span>
                                  </div>
                                ))}
                                <div className="flex items-center justify-between text-sm border-t border-border pt-1.5 mt-1.5">
                                  <span className="text-foreground font-bold">ВСЕГО б/н</span>
                                  <span className="text-foreground font-bold">{grandTotal.toFixed(2)} л.</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Десктоп — таблица
                      return (
                        <table className="w-full text-sm border-collapse">
                          <thead className="bg-secondary/80">
                            <tr className="border-b-2 border-border">
                              <th className={`${thClass} text-center text-foreground border-r-2 border-border`}>Наименование</th>
                              <th className={`${thClass} text-center text-foreground border-r-2 border-border`}>Код</th>
                              {paymentTypes.map(([key, name]) => (
                                <th key={key} className={`${thClass} text-center text-foreground border-r-2 border-border`}>{name}<br/>л.</th>
                              ))}
                              <th className={`${thClass} text-center text-foreground`}>ИТОГО б/н<br/>л.</th>
                            </tr>
                          </thead>
                          <tbody className="bg-card">
                            {rows.map((row, idx) => {
                              const rowTotal = paymentTypes.reduce((s, [key]) => s + (row.byPayType[key] || 0), 0);
                              return (
                                <tr key={idx} className="border-b border-border">
                                  <td className={`${tdClass} text-foreground font-medium border-r-2 border-border`}>{row.fuelName}</td>
                                  <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{row.fuelCode}</td>
                                  {paymentTypes.map(([key]) => (
                                    <td key={key} className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{(row.byPayType[key] || 0).toFixed(2)}</td>
                                  ))}
                                  <td className={`${tdClass} text-center text-foreground font-medium`}>{rowTotal.toFixed(2)}</td>
                                </tr>
                              );
                            })}
                            <tr className="border-t-2 border-border bg-secondary/50">
                              <td className={`${tdClass} text-foreground font-bold text-right`} colSpan={2}>Всего:</td>
                              {paymentTypes.map(([key]) => (
                                <td key={key} className={`${tdClass} text-center text-foreground font-bold border-r-2 border-border`}>{totals[key].toFixed(2)}</td>
                              ))}
                              <td className={`${tdClass} text-center text-foreground font-bold`}>{grandTotal.toFixed(2)}</td>
                            </tr>
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>
                </div>
              </TabsContent>

              {/* Состояние резервуаров */}
              <TabsContent value="tanks" className={isMobile ? 'mt-2' : 'mt-4'}>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground text-center">
                    Состояние резервуаров
                  </h3>
                </div>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className={`w-full border-collapse ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    <thead className="bg-secondary/80">
                      <tr className="border-b-2 border-border">
                        <th className={`${thClass} text-left text-foreground border-r-2 border-border`} rowSpan={3}>Наименование<br/>нефте-<br/>продуктов</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={3}>N<br/>Резер-<br/>вуара</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={3}>Плотн.<br/>на<br/>начало<br/>смены<br/>г/см3</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} colSpan={2}>Книжный остаток<br/>на<br/>начало смены</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} colSpan={2}>Поступление<br/>в т.ч. прокачка</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} colSpan={2}>Расход</th>
                        <th className={`${thClass} text-center text-foreground`} colSpan={10}>Остаток на конец смены</th>
                      </tr>
                      <tr className="border-b-2 border-border">
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={2}>литры</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={2}>кг</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={2}>литры</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={2}>кг</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={2}>литры</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={2}>кг</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={2}>Плотн.<br/>г/см3</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={2}>Темп<br/>C</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={2}>общий<br/>уров.<br/>см</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={2}>общий<br/>объем<br/>л</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={2}>уров.<br/>воды<br/>см</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={2}>объем<br/>воды<br/>л</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} colSpan={2}>Факт.остаток н/п.</th>
                        <th className={`${thClass} text-center text-foreground`} colSpan={2}>расчетн.кн.ост.</th>
                      </tr>
                      <tr className="border-b-2 border-border">
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}>литры</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}>кг</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}>литры</th>
                        <th className={`${thClass} text-center text-foreground`}>кг</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card">
                      {details.tanks.length === 0 ? (
                        <tr>
                          <td colSpan={19} className="px-4 py-8 text-center text-muted-foreground">
                            Данные по резервуарам недоступны. На данной торговой точке отсутствуют автоматические уровнемеры или данные не передаются в систему.
                          </td>
                        </tr>
                      ) : (
                        details.tanks.map((tank, idx) => (
                          <tr key={idx} className="border-b border-border">
                            <td className={`${tdClass} text-foreground font-medium border-r-2 border-border`}>{tank.fuelName}</td>
                            <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{tank.tankNumber}</td>
                            <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{tank.density ? tank.density.toFixed(4) : '—'}</td>
                            <td className={`${tdClass} text-right text-foreground font-medium border-r-2 border-border`}>{tank.volumeBegin.toFixed(2)}</td>
                            <td className={`${tdClass} text-right text-foreground border-r-2 border-border`}>{(tank.volumeBegin * (tank.density || 1)).toFixed(2)}</td>
                            <td className={`${tdClass} text-right text-foreground font-medium border-r-2 border-border`}>{tank.volumeReceived.toFixed(2)}</td>
                            <td className={`${tdClass} text-right text-foreground border-r-2 border-border`}>{(tank.volumeReceived * (tank.density || 1)).toFixed(2)}</td>
                            <td className={`${tdClass} text-right text-foreground font-medium border-r-2 border-border`}>{tank.volumeDispensed.toFixed(2)}</td>
                            <td className={`${tdClass} text-right text-foreground border-r-2 border-border`}>{(tank.volumeDispensed * (tank.density || 1)).toFixed(2)}</td>
                            <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{tank.density ? tank.density.toFixed(4) : '—'}</td>
                            <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{tank.temperature?.toFixed(1) || '—'}</td>
                            <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{tank.level?.toFixed(2) || '—'}</td>
                            <td className={`${tdClass} text-right text-foreground font-medium border-r-2 border-border`}>{tank.volumeEnd.toFixed(2)}</td>
                            <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{tank.waterLevel?.toFixed(2) || '—'}</td>
                            <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{tank.waterVolume?.toFixed(2) || '—'}</td>
                            <td className={`${tdClass} text-right text-foreground font-medium border-r-2 border-border`}>{tank.volumeEnd.toFixed(2)}</td>
                            <td className={`${tdClass} text-right text-foreground border-r-2 border-border`}>{(tank.volumeEnd * (tank.density || 1)).toFixed(2)}</td>
                            <td className={`${tdClass} text-right text-foreground font-medium border-r-2 border-border`}>{tank.volumeCalculated.toFixed(2)}</td>
                            <td className={`${tdClass} text-right text-foreground`}>{(tank.volumeCalculated * (tank.density || 1)).toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* Поступления */}
              <TabsContent value="receipts" className={isMobile ? 'mt-2' : 'mt-4'}>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground text-center">
                    Расшифровка поступлений
                  </h3>
                </div>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className={`w-full border-collapse ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    <thead className="bg-secondary/80">
                      <tr className="border-b-2 border-border">
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} colSpan={2}>Нефтепродукты</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} colSpan={2}>Поставщик</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={2}>№<br/>Докум.</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} rowSpan={2}>№<br/>рез</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`} colSpan={4}>По документу</th>
                        <th className={`${thClass} text-center text-foreground`} colSpan={4}>Фактически</th>
                      </tr>
                      <tr className="border-b-2 border-border">
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}>Наименование</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}>Код</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}>Наименование</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}>Код</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}>Объем<br/>л</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}>Плотн<br/>г/см3</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}>Масса<br/>кг</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}>Темп.<br/>°C</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}>Объем<br/>л</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}>Плотн<br/>г/см3</th>
                        <th className={`${thClass} text-center text-foreground border-r-2 border-border`}>Масса<br/>кг</th>
                        <th className={`${thClass} text-center text-foreground`}>Темп.<br/>°C</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card">
                      {details.receipts.length === 0 ? (
                        <tr>
                          <td colSpan={14} className="px-4 py-8 text-center text-muted-foreground">
                            Нет поступлений за период смены
                          </td>
                        </tr>
                      ) : (
                        details.receipts.map((receipt, idx) => (
                          <tr key={idx} className="border-b border-border">
                            <td className={`${tdClass} text-foreground border-r-2 border-border`}>{receipt.fuelName}</td>
                            <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{receipt.fuelCode}</td>
                            <td className={`${tdClass} text-foreground border-r-2 border-border`}>{receipt.supplier || 'Нефтебаза'}</td>
                            <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>1</td>
                            <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{receipt.documentNumber || '—'}</td>
                            <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{receipt.tankNumber}</td>
                            {/* По документу */}
                            <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{receipt.volume.toFixed(0)}</td>
                            <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{receipt.density ? receipt.density.toFixed(4) : '—'}</td>
                            <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{receipt.amount ? receipt.amount.toFixed(0) : '—'}</td>
                            <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{receipt.temperature ? receipt.temperature.toFixed(1) : '—'}</td>
                            {/* Фактически */}
                            <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{receipt.actualVolume ? receipt.actualVolume.toFixed(0) : receipt.volume.toFixed(0)}</td>
                            <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{receipt.actualDensity ? receipt.actualDensity.toFixed(4) : (receipt.density ? receipt.density.toFixed(4) : '—')}</td>
                            <td className={`${tdClass} text-center text-foreground border-r-2 border-border`}>{receipt.actualAmount ? receipt.actualAmount.toFixed(0) : (receipt.amount ? receipt.amount.toFixed(0) : '—')}</td>
                            <td className={`${tdClass} text-center text-foreground`}>{receipt.actualTemperature ? receipt.actualTemperature.toFixed(1) : (receipt.temperature ? receipt.temperature.toFixed(1) : '—')}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* Движение наличных */}
              <TabsContent value="cash" className={isMobile ? 'mt-2' : 'mt-4'}>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground text-center">
                    Движение наличных денег
                  </h3>
                </div>

                {(() => {
                  // Вычисляем суммы по типам операций

                  // "Выручка за смену" (НАЛИЧНЫЕ) - берем из paymentSales
                  const revenue = details.paymentSales
                    .find(p => p.paymentTypeName.toLowerCase().includes('наличн'))
                    ?.cost || 0;

                  // "Принято по смене" = operation.id: 7 (closing) из API
                  // Это остаток на конец предыдущей смены = начало текущей
                  const openingAmount = details.cashMovements
                    .filter(m => m.operationType === 'closing')
                    .reduce((sum, m) => sum + m.amount, 0);

                  const incomeAmount = 0; // "Внесено за смену" - нет в данных

                  // "Передано по смене" = Принято + Внесено + Выручка
                  const closingAmount = openingAmount + incomeAmount + revenue;

                  const totalIncome = openingAmount + incomeAmount + revenue;

                  const toBankAmount = 0; // "Сдано в банк" - нет в API
                  const cashOutAmount = 0; // "Выдано наличными" - нет в API

                  const totalExpense = toBankAmount + cashOutAmount + closingAmount;

                  return (
                    <div className="space-y-1">
                      {/* Приход */}
                      <div className="flex justify-between items-center py-2">
                        <span className="text-foreground pl-8">Принято по смене</span>
                        <span className="text-foreground font-medium">{formatCurrency(openingAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-foreground pl-8">Внесено за смену</span>
                        <span className="text-foreground font-medium">{formatCurrency(incomeAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-foreground pl-8">Выручка за смену</span>
                        <span className="text-foreground font-medium">{formatCurrency(revenue)}</span>
                      </div>

                      {/* Итого приход */}
                      <div className="flex justify-between items-center py-2 bg-secondary/30">
                        <span className="text-foreground font-semibold pl-16">Итого:</span>
                        <span className="text-foreground font-bold">{formatCurrency(totalIncome)}</span>
                      </div>

                      {/* Расход */}
                      <div className="flex justify-between items-center py-2">
                        <span className="text-foreground pl-8">Сдано в банк</span>
                        <span className="text-foreground font-medium">{formatCurrency(toBankAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-foreground pl-8">Выдано наличными</span>
                        <span className="text-foreground font-medium">{formatCurrency(cashOutAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-foreground pl-8">Передано по смене</span>
                        <span className="text-foreground font-medium">{formatCurrency(closingAmount)}</span>
                      </div>

                      {/* Итого расход */}
                      <div className="flex justify-between items-center py-2 bg-secondary/30">
                        <span className="text-foreground font-semibold pl-16">Итого:</span>
                        <span className="text-foreground font-bold">{formatCurrency(totalExpense)}</span>
                      </div>
                    </div>
                  );
                })()}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Диалог экспорта */}
        <ExportDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          onExport={handleExport}
          isExporting={isExporting}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ShiftDetailsModal;
