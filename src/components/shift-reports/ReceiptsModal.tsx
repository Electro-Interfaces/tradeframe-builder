/**
 * Модальное окно "Чеки" - отображает cash_sum и bank_sum по торговым точкам
 *
 * Показывает суммы для пробития чеков:
 * - Положительное значение = чек продажи
 * - Отрицательное значение = чек возврата
 */

import { useEffect, useState } from 'react';
import { Receipt, AlertTriangle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { getBackendOrigin } from '@/utils/backendUrl';

interface V2PosInfo {
  number: number;
  cash_sum: number;
  bank_sum: number;
  dt_info: string;
}

interface V2StationInfo {
  system: number;
  station: number;
  pos: V2PosInfo[];
}

interface ReceiptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemId: number;
  /** Номера станций из справочника (только реальные, без тестовых) */
  stations: number[];
  stationNames?: Record<number, string>;
}

interface ReceiptData {
  station: number;
  stationName: string;
  cashSum: number;
  bankSum: number;
  lastUpdate: string;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 2,
  }).format(value);
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function ReceiptsModal({ isOpen, onClose, systemId, stations, stationNames = {} }: ReceiptsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReceiptData[]>([]);

  /** Простой fetch без ретраев — 500 от STS API не имеет смысла ретраить */
  const fetchV2Info = async (station: number): Promise<V2StationInfo[] | null> => {
    try {
      const baseUrl = getBackendOrigin();
      const url = `${baseUrl}/api/sts/v2/info?system=${systemId}&station=${station}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  };

  const loadData = async () => {
    if (!systemId || stations.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // Запрашиваем /v2/info только для станций из справочника (параллельно)
      const v2Results = await Promise.all(
        stations.map(async (station) => {
          const result = await fetchV2Info(station);
          return { station, result };
        })
      );

      const receiptsData: ReceiptData[] = v2Results
        .map(({ station, result }) => {
          if (!result?.[0]) return null;

          const stationData = result[0];
          let totalCashSum = 0;
          let totalBankSum = 0;
          let latestDtInfo = '';

          for (const pos of stationData.pos || []) {
            totalCashSum += pos.cash_sum || 0;
            totalBankSum += pos.bank_sum || 0;
            if (pos.dt_info && (!latestDtInfo || new Date(pos.dt_info) > new Date(latestDtInfo))) {
              latestDtInfo = pos.dt_info;
            }
          }

          return {
            station: stationData.station,
            stationName: stationNames[stationData.station] || `Станция ${stationData.station}`,
            cashSum: totalCashSum,
            bankSum: totalBankSum,
            lastUpdate: latestDtInfo,
          };
        })
        .filter((item): item is ReceiptData => item !== null)
        .sort((a, b) => a.station - b.station);

      setData(receiptsData);

      if (receiptsData.length === 0) {
        setError('Нет данных по станциям');
      }
    } catch (err: any) {
      console.error('[ReceiptsModal] Ошибка загрузки:', err);
      setError(`Ошибка загрузки: ${err?.message || 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && systemId && stations.length > 0) {
      loadData();
    }
  }, [isOpen, systemId, stations.length]);

  // Подсчёт станций с ненулевыми суммами
  const stationsWithReceipts = data.filter(d => d.cashSum !== 0 || d.bankSum !== 0);
  const totalCash = data.reduce((sum, d) => sum + d.cashSum, 0);
  const totalBank = data.reduce((sum, d) => sum + d.bankSum, 0);

  // Мобильное отображение - карточки вместо таблицы
  const MobileCard = ({ item }: { item: ReceiptData }) => {
    const hasReceipts = item.cashSum !== 0 || item.bankSum !== 0;
    return (
      <div className={`p-3 rounded-lg border ${hasReceipts ? 'bg-amber-100 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700/50' : 'bg-secondary/30 border-border'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-foreground font-medium text-sm">{item.stationName}</div>
          {hasReceipts ? (
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          ) : (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
        </div>
        <div className="text-muted-foreground text-xs mb-2">
          Обновлено: {formatDate(item.lastUpdate)}
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">Наличные</div>
            {item.cashSum !== 0 ? (
              <div className={item.cashSum > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                {formatCurrency(item.cashSum)}
                <div className="text-xs text-muted-foreground">
                  {item.cashSum > 0 ? 'продажа' : 'возврат'}
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Безнал</div>
            {item.bankSum !== 0 ? (
              <div className={item.bankSum > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                {formatCurrency(item.bankSum)}
                <div className="text-xs text-muted-foreground">
                  {item.bankSum > 0 ? 'продажа' : 'возврат'}
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border-border w-[95vw] max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Чеки для пробития
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Суммы для корректировки кассы
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto -mx-2 px-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
              <span className="ml-2 text-muted-foreground">Загрузка...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600 dark:text-red-400">
              {error}
              <Button variant="ghost" size="sm" onClick={loadData} className="ml-2">
                Повторить
              </Button>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Нет данных
            </div>
          ) : (
            <>
              {/* Итоговая информация */}
              {(totalCash !== 0 || totalBank !== 0) && (
                <div className="mb-4 p-3 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700/50 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium text-sm">Требуется пробить чеки</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs block">Наличные:</span>
                      <span className={`font-medium ${totalCash > 0 ? 'text-green-600 dark:text-green-400' : totalCash < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                        {formatCurrency(totalCash)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs block">Безнал:</span>
                      <span className={`font-medium ${totalBank > 0 ? 'text-green-600 dark:text-green-400' : totalBank < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                        {formatCurrency(totalBank)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Мобильные карточки */}
              <div className="md:hidden space-y-2">
                {data.map((item) => (
                  <MobileCard key={item.station} item={item} />
                ))}
              </div>

              {/* Desktop таблица */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className="bg-background/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                        Станция
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase">
                        Наличные
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase">
                        Безнал
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground uppercase">
                        Статус
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.map((item) => {
                      const hasReceipts = item.cashSum !== 0 || item.bankSum !== 0;
                      return (
                        <tr
                          key={item.station}
                          className={hasReceipts ? 'bg-amber-100 dark:bg-amber-900/20' : 'hover:bg-secondary/30'}
                        >
                          <td className="px-3 py-2">
                            <div className="text-foreground font-medium">{item.stationName}</div>
                            <div className="text-muted-foreground text-xs">
                              Обновлено: {formatDate(item.lastUpdate)}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            {item.cashSum !== 0 ? (
                              <div className={item.cashSum > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                {formatCurrency(item.cashSum)}
                                <div className="text-xs text-muted-foreground">
                                  {item.cashSum > 0 ? 'Чек продажи' : 'Чек возврата'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {item.bankSum !== 0 ? (
                              <div className={item.bankSum > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                {formatCurrency(item.bankSum)}
                                <div className="text-xs text-muted-foreground">
                                  {item.bankSum > 0 ? 'Чек продажи' : 'Чек возврата'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {hasReceipts ? (
                              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mx-auto" />
                            ) : (
                              <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Легенда и кнопка обновления */}
              <div className="mt-4 p-2 md:p-3 bg-background/50 rounded-lg text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2 md:gap-4">
                  <div className="flex items-center gap-1">
                    <span className="text-green-600 dark:text-green-400">+</span> Продажа
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-red-600 dark:text-red-400">−</span> Возврат
                  </div>
                  <div className="flex items-center gap-1 ml-auto">
                    <Button variant="ghost" size="sm" onClick={loadData} className="h-6 px-2">
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Обновить
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ReceiptsModal;
