/**
 * Компонент таблицы цен по торговым точкам сети
 */

import { AlertTriangle } from 'lucide-react';
import type { NetworkPriceData, PriceStatistics } from '@/hooks/useNetworkPrices';

interface StationPricesTableProps {
  networkPrices: NetworkPriceData[];
  statistics: PriceStatistics[];
  isMobile: boolean;
}

/**
 * Форматирование цены
 */
function formatPrice(price: number): string {
  return price.toFixed(2);
}

/**
 * Проверка отклонения цены от средней
 */
function checkPriceDeviation(price: number, avgPrice: number): {
  hasDeviation: boolean;
  deviationPercent: number;
} {
  if (avgPrice === 0) return { hasDeviation: false, deviationPercent: 0 };

  const deviation = ((price - avgPrice) / avgPrice) * 100;
  const hasDeviation = Math.abs(deviation) > 5; // Порог 5%

  return {
    hasDeviation,
    deviationPercent: Math.round(deviation * 10) / 10
  };
}

export function StationPricesTable({ networkPrices, statistics, isMobile }: StationPricesTableProps) {
  if (networkPrices.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p>Нет данных о ценах</p>
      </div>
    );
  }

  // Получаем все уникальные типы топлива
  const fuelTypes = Array.from(
    new Set(networkPrices.flatMap(np => np.prices.map(p => p.fuelType)))
  ).sort();

  // Мобильная версия - карточки
  if (isMobile) {
    return (
      <div className="space-y-3">
        {networkPrices.map((stationData) => {
          // Находим самую позднюю дату установки цены среди всех топлив
          const latestEffectiveDate = stationData.prices.reduce((latest, price) => {
            if (!price.effectiveDate) return latest;
            if (!latest) return price.effectiveDate;
            return new Date(price.effectiveDate) > new Date(latest) ? price.effectiveDate : latest;
          }, '' as string);

          return (
            <div
              key={stationData.stationId}
              className="bg-slate-700/30 rounded-lg border border-slate-600 p-3"
            >
              {/* Название станции */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-600">
                <div>
                  <div className="font-medium text-white text-sm">{stationData.stationName}</div>
                  <div className="text-xs text-slate-400">{stationData.stationDescription || `АЗС №${stationData.stationNumber}`}</div>
                </div>
                <div className="text-[10px] text-slate-400">
                  {latestEffectiveDate
                    ? new Date(latestEffectiveDate).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit'
                      })
                    : '—'
                  }
                </div>
              </div>

              {/* Цены по топливу - построчно */}
              <div className="space-y-1">
                {fuelTypes.map(fuelType => {
                  const price = stationData.prices.find(p => p.fuelType === fuelType);
                  const stat = statistics.find(s => s.fuelType === fuelType);

                  if (!price || !stat) {
                    return (
                      <div key={fuelType} className="flex items-center justify-between py-1.5 border-b border-slate-700/50 last:border-b-0">
                        <span className="text-xs text-slate-500">{fuelType}</span>
                        <span className="text-xs text-slate-600">—</span>
                      </div>
                    );
                  }

                  const deviation = checkPriceDeviation(price.price, stat.averagePrice);

                  return (
                    <div key={fuelType} className="flex items-center justify-between py-1.5 border-b border-slate-700/50 last:border-b-0">
                      <span className="text-xs text-slate-400">{fuelType}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white">
                          {formatPrice(price.price)} ₽
                        </span>
                        {deviation.hasDeviation && (
                          <>
                            <AlertTriangle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                            <span className="text-[10px] text-yellow-500">
                              {deviation.deviationPercent > 0 ? '+' : ''}
                              {deviation.deviationPercent}%
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Desktop версия - таблица
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-800 z-10">
          <tr className="border-b border-slate-600">
            <th className="text-left pb-3 px-4 text-slate-300 font-medium">Торговая точка</th>
            {fuelTypes.map(fuelType => (
              <th key={fuelType} className="text-center pb-3 px-3 text-slate-300 font-medium">
                {fuelType}
              </th>
            ))}
            <th className="text-center pb-3 px-3 text-slate-300 font-medium">Дата установки</th>
          </tr>
        </thead>
        <tbody>
          {networkPrices.map((stationData) => {
            // Находим самую позднюю дату установки цены среди всех топлив
            const latestEffectiveDate = stationData.prices.reduce((latest, price) => {
              if (!price.effectiveDate) return latest;
              if (!latest) return price.effectiveDate;
              return new Date(price.effectiveDate) > new Date(latest) ? price.effectiveDate : latest;
            }, '' as string);

            return (
              <tr
                key={stationData.stationId}
                className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
              >
                {/* Название станции */}
                <td className="py-3 px-4">
                  <div>
                    <div className="text-white font-medium">{stationData.stationName}</div>
                    <div className="text-xs text-slate-400">{stationData.stationDescription || `АЗС №${stationData.stationNumber}`}</div>
                  </div>
                </td>

                {/* Цены по каждому типу топлива */}
                {fuelTypes.map(fuelType => {
                  const price = stationData.prices.find(p => p.fuelType === fuelType);
                  const stat = statistics.find(s => s.fuelType === fuelType);

                  if (!price || !stat) {
                    return (
                      <td key={fuelType} className="py-3 px-3 text-center">
                        <span className="text-slate-600">—</span>
                      </td>
                    );
                  }

                  const deviation = checkPriceDeviation(price.price, stat.averagePrice);

                  return (
                    <td key={fuelType} className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-bold text-white">
                          {formatPrice(price.price)}
                        </span>
                        {deviation.hasDeviation && (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            <span className="text-xs text-yellow-500">
                              {deviation.deviationPercent > 0 ? '+' : ''}
                              {deviation.deviationPercent}%
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}

                {/* Дата установки последней цены */}
                <td className="py-3 px-3 text-center">
                  <span className="text-slate-300 text-xs">
                    {latestEffectiveDate
                      ? new Date(latestEffectiveDate).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })
                      : '—'
                    }
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
