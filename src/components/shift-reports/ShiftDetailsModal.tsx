import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { ShiftDetails } from '@/types/shift-reports-v2';
import { shiftReportsV2Service } from '@/services/shiftReportsV2Service';

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

  useEffect(() => {
    if (isOpen && shiftNumber !== null) {
      loadShiftDetails();
    }
  }, [isOpen, shiftNumber]);

  const loadShiftDetails = async () => {
    if (shiftNumber === null) return;

    console.log('🔍 ShiftDetailsModal: Загрузка деталей смены', {
      shiftNumber,
      system,
      station,
      stationName
    });

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

      console.log('✅ ShiftDetailsModal: Детали загружены', data);
      setDetails(data);
    } catch (err) {
      console.error('❌ Ошибка загрузки деталей смены', err);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <Badge className="bg-green-500/10 text-green-400 border-green-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Открыта
          </Badge>
        );
      case 'closed':
        return (
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Закрыта
          </Badge>
        );
      case 'synchronized':
        return (
          <Badge className="bg-purple-500/10 text-purple-400 border-purple-500 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Синхронизирована
          </Badge>
        );
      default:
        return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500">Неизвестно</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] bg-slate-800 border-slate-700 flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-3">
            <span>Детали смены #{shiftNumber}</span>
            {details && getStatusBadge(details.status)}
          </DialogTitle>
          {stationName && (
            <p className="text-slate-400 text-sm">{stationName}</p>
          )}
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-slate-400">Загрузка деталей смены...</div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-16">
            <div className="text-red-400">{error}</div>
          </div>
        )}

        {details && !loading && !error && (
          <div className="space-y-6 flex-1 overflow-y-auto">
            {/* Основная информация */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-slate-400 text-sm mb-1">Статус</div>
                <div className="mt-2">
                  {details.status === 'open' ? (
                    <Badge className="bg-green-500/10 text-green-400 border-green-500 flex items-center gap-1 w-fit">
                      <Clock className="w-3 h-3" />
                      Открыта
                    </Badge>
                  ) : details.status === 'closed' ? (
                    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500 flex items-center gap-1 w-fit">
                      <CheckCircle className="w-3 h-3" />
                      Закрыта
                    </Badge>
                  ) : (
                    <Badge className="bg-purple-500/10 text-purple-400 border-purple-500 flex items-center gap-1 w-fit">
                      <CheckCircle className="w-3 h-3" />
                      Синхронизирована
                    </Badge>
                  )}
                </div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-slate-400 text-sm mb-1">Открыта</div>
                <div className="text-white font-semibold">{formatDateTime(details.openedAt)}</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-slate-400 text-sm mb-1">Закрыта</div>
                <div className="text-white font-semibold">
                  {details.closedAt ? formatDateTime(details.closedAt) : '—'}
                </div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-slate-400 text-sm mb-1">Оператор</div>
                <div className="text-white font-semibold">{details.operator}</div>
              </div>
            </div>

            {/* Вкладки с детальной информацией */}
            <Tabs defaultValue="composition" className="w-full">
              <TabsList className="bg-slate-700 w-full justify-start overflow-x-auto">
                <TabsTrigger value="composition" className="data-[state=active]:bg-slate-600">
                  Состав смены
                </TabsTrigger>
                <TabsTrigger value="tanks" className="data-[state=active]:bg-slate-600">
                  Состояние резервуаров
                </TabsTrigger>
                <TabsTrigger value="receipts" className="data-[state=active]:bg-slate-600">
                  Поступления
                </TabsTrigger>
                <TabsTrigger value="sales" className="data-[state=active]:bg-slate-600">
                  Расшифровка реализации
                </TabsTrigger>
                <TabsTrigger value="cash" className="data-[state=active]:bg-slate-600">
                  Движение наличных
                </TabsTrigger>
              </TabsList>

              {/* Состав смены - Показания счетных механизмов */}
              <TabsContent value="composition" className="mt-4">
                <div className="mb-4 text-slate-300">
                  <p>Смена с {details.openedAt ? formatDateTime(details.openedAt) : '—'} до {details.closedAt ? formatDateTime(details.closedAt) : '—'}</p>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-600">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-slate-700/80">
                      <tr className="border-b-2 border-slate-400">
                        <th className="px-2 py-2 text-left text-slate-100 border-r-2 border-slate-400" rowSpan={4}>Наименование<br/>нефтепродуктов</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={4}>N<br/>Резер-<br/>вуара</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={4}>Плотн<br/>кг/м3</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" colSpan={5}>Показание счетных механизмов</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={4}>Цена<br/>за литр<br/>руб.</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={4}>Сумма,<br/>руб.</th>
                        <th className="px-2 py-2 text-center text-slate-100" colSpan={2}>Погрешность ТРК</th>
                      </tr>
                      <tr className="border-b-2 border-slate-400">
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={3}>№<br/>ТРК</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={3}>на конец<br/>смены<br/>л</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={3}>на начало<br/>смены<br/>л</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" colSpan={2}>расход</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={3}>проц.</th>
                        <th className="px-2 py-2 text-center text-slate-100" rowSpan={3}>литры</th>
                      </tr>
                      <tr className="border-b-2 border-slate-400">
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={2}>л</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={2}>кг.</th>
                      </tr>
                    </thead>
                    <tbody className="bg-slate-800">
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
                              <tr key={`${fuel.fuelCode}-${nozzle.nozzle}`} className="border-b border-slate-600">
                                {nIdx === 0 ? (
                                  <>
                                    <td className="px-3 py-2 text-white font-medium border-r-2 border-slate-600" rowSpan={nozzles.length + 1}>
                                      {fuel.fuelName}
                                    </td>
                                    <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600" rowSpan={nozzles.length + 1}>
                                      {tank?.tankNumber || '—'}
                                    </td>
                                    <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600" rowSpan={1}>
                                      {nozzle.density ? nozzle.density.toFixed(1) : '—'}
                                    </td>
                                  </>
                                ) : (
                                  <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600"></td>
                                )}
                                <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{nozzle.nozzle}</td>
                                <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{nozzle.endCounter.toFixed(2)}</td>
                                <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{nozzle.startCounter.toFixed(2)}</td>
                                <td className="px-3 py-2 text-center text-white font-medium border-r-2 border-slate-600">{nozzle.volume.toFixed(2)}</td>
                                <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{nozzle.amount.toFixed(2)}</td>
                                <td className="px-3 py-2 text-center text-white font-medium border-r-2 border-slate-600">{nozzle.price.toFixed(2)}</td>
                                <td className="px-3 py-2 text-right text-white font-medium border-r-2 border-slate-600">{formatCurrency(nozzle.cost)}</td>
                                <td className="px-3 py-2 text-center text-slate-500 border-r-2 border-slate-600">0.00</td>
                                <td className="px-3 py-2 text-center text-slate-500">0.000</td>
                              </tr>
                            ))}
                            {/* Строка "Всего:" */}
                            <tr className="border-b-2 border-slate-400 bg-slate-700/50">
                              <td className="px-3 py-2 text-white font-bold">Всего:</td>
                              <td className="px-3 py-2 border-r-2 border-slate-600"></td>
                              <td className="px-3 py-2 text-center text-white font-bold border-r-2 border-slate-600">{totalEndCounter.toFixed(2)}</td>
                              <td className="px-3 py-2 text-center text-white font-bold border-r-2 border-slate-600">{totalStartCounter.toFixed(2)}</td>
                              <td className="px-3 py-2 text-center text-white font-bold border-r-2 border-slate-600">{totalVolume.toFixed(2)}</td>
                              <td className="px-3 py-2 text-center text-white font-bold border-r-2 border-slate-600">{totalAmount.toFixed(2)}</td>
                              <td className="px-3 py-2 border-r-2 border-slate-600"></td>
                              <td className="px-3 py-2 text-right text-white font-bold border-r-2 border-slate-600">{formatCurrency(totalCost)}</td>
                              <td className="px-3 py-2 border-r-2 border-slate-600"></td>
                              <td className="px-3 py-2"></td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                      {/* Строка "ИТОГО:" для всей таблицы */}
                      <tr className="border-t-2 border-slate-400 bg-slate-600">
                        <td className="px-3 py-2 text-white font-bold text-lg">ИТОГО:</td>
                        <td className="px-3 py-2 border-r-2 border-slate-400"></td>
                        <td className="px-3 py-2 border-r-2 border-slate-400"></td>
                        <td className="px-3 py-2 border-r-2 border-slate-400"></td>
                        <td className="px-3 py-2 text-center text-white font-bold border-r-2 border-slate-400">
                          {details.nozzleReadings.reduce((sum, n) => sum + n.endCounter, 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center text-white font-bold border-r-2 border-slate-400">
                          {details.nozzleReadings.reduce((sum, n) => sum + n.startCounter, 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center text-white font-bold border-r-2 border-slate-400">
                          {details.nozzleReadings.reduce((sum, n) => sum + n.volume, 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center text-white font-bold border-r-2 border-slate-400">
                          {details.nozzleReadings.reduce((sum, n) => sum + n.amount, 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 border-r-2 border-slate-400"></td>
                        <td className="px-3 py-2 text-right text-white font-bold border-r-2 border-slate-400">
                          {formatCurrency(details.nozzleReadings.reduce((sum, n) => sum + n.cost, 0))}
                        </td>
                        <td className="px-3 py-2 border-r-2 border-slate-400"></td>
                        <td className="px-3 py-2"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-xs text-slate-400">
                  <p>* Погрешность ТРК недоступна в текущей версии API</p>
                </div>
              </TabsContent>

              {/* Показания счетных механизмов (ТРК) - placeholder */}
              {/* Продажи по топливу → переименовано в Расшифровка реализации */}
              <TabsContent value="sales" className="mt-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white text-center">
                    Расшифровка реализации
                  </h3>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-600">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-slate-700/80">
                      {/* Первый уровень заголовков */}
                      <tr className="border-b-2 border-slate-400">
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" colSpan={2} rowSpan={2}>Нефтепродукты, товары</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={2}>Прокачка<br/>л.</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" colSpan={2}>По картам</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={2}>Скидка<br/>руб.</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" colSpan={2}>За наличные</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={2}>Безнал.<br/>л.</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={2}>Всего<br/>л.</th>
                        <th className="px-2 py-2 text-center text-slate-100" rowSpan={2}>Разница<br/>л.</th>
                      </tr>
                      {/* Второй уровень заголовков */}
                      <tr className="border-b-2 border-slate-400">
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400">л.</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400">руб.</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400">л.</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400">руб.</th>
                      </tr>
                      {/* Третий уровень - подзаголовки */}
                      <tr className="border-b-2 border-slate-400">
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400">Наименование</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400">Код</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400"></th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400"></th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400"></th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400"></th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400"></th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400"></th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400"></th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400"></th>
                        <th className="px-2 py-2 text-center text-slate-100"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-slate-800">
                      {details.salesBreakdown.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-600">
                          <td className="px-3 py-2 text-white font-medium border-r-2 border-slate-600">{item.fuelName}</td>
                          <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{item.fuelCode}</td>
                          <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{item.pumpVolume.toFixed(2)}</td>
                          <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{item.cardVolume.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-white border-r-2 border-slate-600">{formatCurrency(item.cardCost)}</td>
                          <td className="px-3 py-2 text-right text-white border-r-2 border-slate-600">{item.discountCost.toFixed(2)}</td>
                          <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{item.cashVolume.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-white border-r-2 border-slate-600">{formatCurrency(item.cashCost)}</td>
                          <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{item.nonCashVolume.toFixed(2)}</td>
                          <td className="px-3 py-2 text-center text-white font-medium border-r-2 border-slate-600">{item.totalVolume.toFixed(2)}</td>
                          <td className="px-3 py-2 text-center text-white">{item.difference.toFixed(2)}</td>
                        </tr>
                      ))}
                      {/* Строка "Всего:" */}
                      <tr className="border-t-2 border-slate-400 bg-slate-700/50">
                        <td className="px-3 py-2 text-white font-bold" colSpan={2}>Всего:</td>
                        <td className="px-3 py-2 text-center text-white font-bold border-r-2 border-slate-600">
                          {details.salesBreakdown.reduce((sum, item) => sum + item.pumpVolume, 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center text-white font-bold border-r-2 border-slate-600">
                          {details.salesBreakdown.reduce((sum, item) => sum + item.cardVolume, 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right text-white font-bold border-r-2 border-slate-600">
                          {formatCurrency(details.salesBreakdown.reduce((sum, item) => sum + item.cardCost, 0))}
                        </td>
                        <td className="px-3 py-2 text-right text-white font-bold border-r-2 border-slate-600">
                          {details.salesBreakdown.reduce((sum, item) => sum + item.discountCost, 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center text-white font-bold border-r-2 border-slate-600">
                          {details.salesBreakdown.reduce((sum, item) => sum + item.cashVolume, 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right text-white font-bold border-r-2 border-slate-600">
                          {formatCurrency(details.salesBreakdown.reduce((sum, item) => sum + item.cashCost, 0))}
                        </td>
                        <td className="px-3 py-2 text-center text-white font-bold border-r-2 border-slate-600">
                          {details.salesBreakdown.reduce((sum, item) => sum + item.nonCashVolume, 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center text-white font-bold border-r-2 border-slate-600">
                          {details.salesBreakdown.reduce((sum, item) => sum + item.totalVolume, 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center text-white font-bold">
                          {details.salesBreakdown.reduce((sum, item) => sum + item.difference, 0).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Таблица безналичной реализации */}
                <div className="mt-8">
                  <h4 className="text-md font-semibold text-white mb-3 text-center">Безналичная реализация</h4>
                  <div className="overflow-x-auto rounded-lg border border-slate-600">
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-slate-700/80">
                        <tr className="border-b-2 border-slate-400">
                          <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={2}>Наименование</th>
                          <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={2}>Код</th>
                          <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" colSpan={2}>МобилПр.</th>
                          <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" colSpan={2}>Купон на сдачу</th>
                          <th className="px-2 py-2 text-center text-slate-100" rowSpan={2}>ИТОГО б/н<br/>л.</th>
                        </tr>
                        <tr className="border-b-2 border-slate-400">
                          <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400">л.</th>
                          <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400">руб.</th>
                          <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400">л.</th>
                          <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400">руб.</th>
                        </tr>
                      </thead>
                      <tbody className="bg-slate-800">
                        {(() => {
                          // Получаем данные из sales для безналичных способов оплаты
                          console.log('🔍 Безналичная реализация - salesRaw:', (details as any).salesRaw);

                          // Группируем по видам топлива
                          const fuelGroups = new Map<number, {
                            fuelCode: number;
                            fuelName: string;
                            mobilprVolume: number;
                            mobilprCost: number;
                            couponVolume: number;
                            couponCost: number;
                          }>();

                          // Обрабатываем каждую запись
                          (details as any).salesRaw?.forEach((sale: any) => {
                            const paymentName = sale.pay_type?.name?.toLowerCase() || '';
                            console.log('💳 Способ оплаты:', sale.pay_type?.name);

                            // Проверяем каждый вид топлива в записи
                            sale.fuel?.forEach((fuelItem: any) => {
                              const fuelCode = fuelItem.service?.service_code || 0;
                              const fuelName = fuelItem.service?.service_name || 'Неизвестно';
                              const volume = parseFloat(fuelItem.release?.volume || '0');
                              const cost = parseFloat(fuelItem.release?.cost || '0');

                              console.log(`⛽ Топливо ${fuelName} (${fuelCode}): ${volume}л, ${cost}₽, способ: ${paymentName}`);

                              if (!fuelGroups.has(fuelCode)) {
                                fuelGroups.set(fuelCode, {
                                  fuelCode,
                                  fuelName,
                                  mobilprVolume: 0,
                                  mobilprCost: 0,
                                  couponVolume: 0,
                                  couponCost: 0,
                                });
                              }

                              const group = fuelGroups.get(fuelCode)!;

                              // МобилПр
                              if (paymentName.includes('мобил')) {
                                group.mobilprVolume += volume;
                                group.mobilprCost += cost;
                              }

                              // Купон на сдачу
                              if (paymentName.includes('купон')) {
                                group.couponVolume += volume;
                                group.couponCost += cost;
                              }
                            });
                          });

                          const rows = Array.from(fuelGroups.values());

                          // Подсчитываем итоги
                          const totalMobilprVolume = rows.reduce((sum, r) => sum + r.mobilprVolume, 0);
                          const totalMobilprCost = rows.reduce((sum, r) => sum + r.mobilprCost, 0);
                          const totalCouponVolume = rows.reduce((sum, r) => sum + r.couponVolume, 0);
                          const totalCouponCost = rows.reduce((sum, r) => sum + r.couponCost, 0);
                          const totalNonCashVolume = rows.reduce((sum, r) => sum + r.mobilprVolume + r.couponVolume, 0);

                          return (
                            <>
                              {rows.map((row, idx) => (
                                <tr key={idx} className="border-b border-slate-600">
                                  <td className="px-3 py-2 text-white font-medium border-r-2 border-slate-600">{row.fuelName}</td>
                                  <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{row.fuelCode}</td>
                                  <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{row.mobilprVolume.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right text-white border-r-2 border-slate-600">{formatCurrency(row.mobilprCost)}</td>
                                  <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{row.couponVolume.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right text-white border-r-2 border-slate-600">{formatCurrency(row.couponCost)}</td>
                                  <td className="px-3 py-2 text-center text-white font-medium">{(row.mobilprVolume + row.couponVolume).toFixed(2)}</td>
                                </tr>
                              ))}
                              {/* Строка "Всего:" */}
                              <tr className="border-t-2 border-slate-400 bg-slate-700/50">
                                <td className="px-3 py-2 text-white font-bold text-right" colSpan={2}>Всего:</td>
                                <td className="px-3 py-2 text-center text-white font-bold border-r-2 border-slate-600">{totalMobilprVolume.toFixed(2)}</td>
                                <td className="px-3 py-2 text-right text-white font-bold border-r-2 border-slate-600">{formatCurrency(totalMobilprCost)}</td>
                                <td className="px-3 py-2 text-center text-white font-bold border-r-2 border-slate-600">{totalCouponVolume.toFixed(2)}</td>
                                <td className="px-3 py-2 text-right text-white font-bold border-r-2 border-slate-600">{formatCurrency(totalCouponCost)}</td>
                                <td className="px-3 py-2 text-center text-white font-bold">{totalNonCashVolume.toFixed(2)}</td>
                              </tr>
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              {/* Состояние резервуаров */}
              <TabsContent value="tanks" className="mt-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white text-center">
                    Состояние резервуаров
                  </h3>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-600">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-slate-700/80">
                      <tr className="border-b-2 border-slate-400">
                        <th className="px-2 py-2 text-left text-slate-100 border-r-2 border-slate-400" rowSpan={3}>Наименование<br/>нефте-<br/>продуктов</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={3}>N<br/>Резер-<br/>вуара</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={3}>Плотн.<br/>на<br/>начало<br/>смены<br/>г/см3</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" colSpan={2}>Книжный остаток<br/>на<br/>начало смены</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" colSpan={2}>Поступление<br/>в т.ч. прокачка</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" colSpan={2}>Расход</th>
                        <th className="px-2 py-2 text-center text-slate-100" colSpan={10}>Остаток на конец смены</th>
                      </tr>
                      <tr className="border-b-2 border-slate-400">
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={2}>литры</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={2}>кг</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={2}>литры</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={2}>кг</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={2}>литры</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={2}>кг</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={2}>Плотн.<br/>г/см3</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={2}>Темп<br/>C</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={2}>общий<br/>уров.<br/>см</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={2}>общий<br/>объем<br/>л</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={2}>уров.<br/>воды<br/>см</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={2}>объем<br/>воды<br/>л</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" colSpan={2}>Факт.остаток н/п.</th>
                        <th className="px-2 py-2 text-center text-slate-100" colSpan={2}>расчетн.кн.ост.</th>
                      </tr>
                      <tr className="border-b-2 border-slate-400">
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400">литры</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400">кг</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400">литры</th>
                        <th className="px-2 py-2 text-center text-slate-100">кг</th>
                      </tr>
                    </thead>
                    <tbody className="bg-slate-800">
                      {details.tanks.map((tank, idx) => (
                        <tr key={idx} className="border-b border-slate-600">
                          <td className="px-3 py-2 text-white font-medium border-r-2 border-slate-600">{tank.fuelName}</td>
                          <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{tank.tankNumber}</td>
                          <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{tank.density ? tank.density.toFixed(4) : '—'}</td>
                          <td className="px-3 py-2 text-right text-white font-medium border-r-2 border-slate-600">{tank.volumeBegin.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-white border-r-2 border-slate-600">{(tank.volumeBegin * (tank.density || 1)).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-white font-medium border-r-2 border-slate-600">{tank.volumeReceived.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-white border-r-2 border-slate-600">{(tank.volumeReceived * (tank.density || 1)).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-white font-medium border-r-2 border-slate-600">{tank.volumeDispensed.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-white border-r-2 border-slate-600">{(tank.volumeDispensed * (tank.density || 1)).toFixed(2)}</td>
                          <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{tank.density ? tank.density.toFixed(4) : '—'}</td>
                          <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{tank.temperature?.toFixed(1) || '—'}</td>
                          <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{tank.level?.toFixed(2) || '—'}</td>
                          <td className="px-3 py-2 text-right text-white font-medium border-r-2 border-slate-600">{tank.volumeEnd.toFixed(2)}</td>
                          <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{tank.waterLevel?.toFixed(2) || '—'}</td>
                          <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{tank.waterVolume?.toFixed(2) || '—'}</td>
                          <td className="px-3 py-2 text-right text-white font-medium border-r-2 border-slate-600">{tank.volumeEnd.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-white border-r-2 border-slate-600">{(tank.volumeEnd * (tank.density || 1)).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-white font-medium border-r-2 border-slate-600">{tank.volumeCalculated.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-white">{(tank.volumeCalculated * (tank.density || 1)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* Поступления */}
              <TabsContent value="receipts" className="mt-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white text-center">
                    Расшифровка поступлений
                  </h3>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-600">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-slate-700/80">
                      <tr className="border-b-2 border-slate-400">
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" colSpan={2}>Нефтепродукты</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" colSpan={2}>Поставщик</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={2}>№<br/>Докум.</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" rowSpan={2}>№<br/>рез</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400" colSpan={4}>По документу</th>
                        <th className="px-2 py-2 text-center text-slate-100" colSpan={4}>Фактически</th>
                      </tr>
                      <tr className="border-b-2 border-slate-400">
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400">Наименование</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400">Код</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400">Наименование</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400">Код</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400">Объем<br/>л</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400">Плотн<br/>г/см3</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400">Масса<br/>кг</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400">Темп.<br/>°C</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400">Объем<br/>л</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400">Плотн<br/>г/см3</th>
                        <th className="px-2 py-2 text-center text-slate-100 border-r-2 border-slate-400">Масса<br/>кг</th>
                        <th className="px-2 py-2 text-center text-slate-100">Темп.<br/>°C</th>
                      </tr>
                    </thead>
                    <tbody className="bg-slate-800">
                      {details.receipts.length === 0 ? (
                        <tr>
                          <td colSpan={14} className="px-4 py-8 text-center text-slate-400">
                            Нет поступлений за период смены
                          </td>
                        </tr>
                      ) : (
                        details.receipts.map((receipt, idx) => (
                          <tr key={idx} className="border-b border-slate-600">
                            <td className="px-3 py-2 text-white border-r-2 border-slate-600">{receipt.fuelName}</td>
                            <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{receipt.fuelCode}</td>
                            <td className="px-3 py-2 text-white border-r-2 border-slate-600">{receipt.supplier || 'Нефтебаза'}</td>
                            <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">1</td>
                            <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{receipt.documentNumber || '—'}</td>
                            <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{receipt.tankNumber}</td>
                            {/* По документу */}
                            <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{receipt.volume.toFixed(0)}</td>
                            <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{receipt.density ? receipt.density.toFixed(4) : '—'}</td>
                            <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{receipt.amount ? receipt.amount.toFixed(0) : '—'}</td>
                            <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{receipt.temperature ? receipt.temperature.toFixed(1) : '—'}</td>
                            {/* Фактически */}
                            <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{receipt.actualVolume ? receipt.actualVolume.toFixed(0) : receipt.volume.toFixed(0)}</td>
                            <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{receipt.actualDensity ? receipt.actualDensity.toFixed(4) : (receipt.density ? receipt.density.toFixed(4) : '—')}</td>
                            <td className="px-3 py-2 text-center text-white border-r-2 border-slate-600">{receipt.actualAmount ? receipt.actualAmount.toFixed(0) : (receipt.amount ? receipt.amount.toFixed(0) : '—')}</td>
                            <td className="px-3 py-2 text-center text-white">{receipt.actualTemperature ? receipt.actualTemperature.toFixed(1) : (receipt.temperature ? receipt.temperature.toFixed(1) : '—')}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* Движение наличных */}
              <TabsContent value="cash" className="mt-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white text-center">
                    Движение наличных денег
                  </h3>
                </div>

                {(() => {
                  // Вычисляем суммы по типам операций
                  console.log('💵 Движение наличных - все cashMovements:', details.cashMovements);

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

                  console.log('💵 Расчёты:', {
                    revenue,
                    openingAmount,
                    closingAmount,
                    totalIncome: openingAmount + incomeAmount + revenue
                  });

                  const totalIncome = openingAmount + incomeAmount + revenue;

                  const toBankAmount = 0; // "Сдано в банк" - нет в API
                  const cashOutAmount = 0; // "Выдано наличными" - нет в API

                  const totalExpense = toBankAmount + cashOutAmount + closingAmount;

                  return (
                    <div className="space-y-1">
                      {/* Приход */}
                      <div className="flex justify-between items-center py-2">
                        <span className="text-white pl-8">Принято по смене</span>
                        <span className="text-white font-medium">{formatCurrency(openingAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-white pl-8">Внесено за смену</span>
                        <span className="text-white font-medium">{formatCurrency(incomeAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-white pl-8">Выручка за смену</span>
                        <span className="text-white font-medium">{formatCurrency(revenue)}</span>
                      </div>

                      {/* Итого приход */}
                      <div className="flex justify-between items-center py-2 bg-slate-700/30">
                        <span className="text-white font-semibold pl-16">Итого:</span>
                        <span className="text-white font-bold">{formatCurrency(totalIncome)}</span>
                      </div>

                      {/* Расход */}
                      <div className="flex justify-between items-center py-2">
                        <span className="text-white pl-8">Сдано в банк</span>
                        <span className="text-white font-medium">{formatCurrency(toBankAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-white pl-8">Выдано наличными</span>
                        <span className="text-white font-medium">{formatCurrency(cashOutAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-white pl-8">Передано по смене</span>
                        <span className="text-white font-medium">{formatCurrency(closingAmount)}</span>
                      </div>

                      {/* Итого расход */}
                      <div className="flex justify-between items-center py-2 bg-slate-700/30">
                        <span className="text-white font-semibold pl-16">Итого:</span>
                        <span className="text-white font-bold">{formatCurrency(totalExpense)}</span>
                      </div>
                    </div>
                  );
                })()}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShiftDetailsModal;
