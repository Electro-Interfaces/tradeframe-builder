/**
 * Модальное окно подробного состояния резервуара (Этап 2 «Остатков»).
 *
 * Показывает КНИЖНЫЙ остаток (из строки TankInventory) в сравнении с
 * ФАКТИЧЕСКИМ состоянием по датчику НА СЕЙЧАС (грузится лениво из раздела
 * «Резервуары» через tanksService.getTanks).
 *
 * Цепочка сопоставления: номер станции → торговая точка (UUID) → Tank по номеру.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  AlertTriangle,
  Droplet,
  Thermometer,
  Gauge,
  Ruler,
  Weight,
  ArrowRight,
  Wifi,
  WifiOff,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFuelColor } from '@/utils/fuelColors';
import { extractStationNumber } from '@/utils/tradingPointUtils';
import { tanksService } from '@/services/tanksService';
import { tradingPointsService } from '@/services/tradingPointsService';
import { useSelection } from '@/contexts/SelectionContext';
import type { TankInventory } from '@/services/fuelInventoryService';
import type { Tank } from '@/types/tanks';
import type { Network } from '@/types/network';
import { formatNumber } from '../utils/fuelInventoryHelpers';

interface TankDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Выбранная строка остатков (книжные данные). */
  tank: TankInventory | null;
  /**
   * Сети-кандидаты, среди которых ищем станцию резервуара.
   * Обычно это выбранные сети (useSelectedNetworks().selectedNetworks).
   * Поиск идёт по каждой сети до первого совпадения станции с сенсорными данными.
   */
  networks: Network[];
}

/** Результат ленивого резолва станция→точка→датчик. */
interface ResolvedTank {
  liveTank: Tank | null;      // данные датчика (null = точка есть, но датчик молчит)
  pointName: string | null;   // имя найденной торговой точки
  networkId: string | null;   // UUID сети, где нашлась станция (для навигации)
  pointId: string | null;     // UUID точки (для навигации)
  reason: 'ok' | 'no-sensor' | 'point-not-found' | 'error';
}

/** Нормализация имени топлива для нестрогого сравнения. */
function normFuel(v: string | number | null | undefined): string {
  return String(v ?? '').trim().toLowerCase().replace(/[\s-]/g, '');
}

/** Форматирование числа литров со знаком (для расхождения). */
function formatSigned(n: number): string {
  const abs = formatNumber(Math.abs(Math.round(n)));
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${abs}`;
}

export function TankDetailDialog({ open, onOpenChange, tank, networks }: TankDetailDialogProps) {
  const navigate = useNavigate();
  const { setSelectedNetwork, setSelectedTradingPoint } = useSelection();

  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState<ResolvedTank | null>(null);

  // Стабильный ключ набора сетей для зависимостей эффекта
  const networkKey = useMemo(() => networks.map((n) => n.id).join(','), [networks]);

  const fuel = tank ? getFuelColor(tank.fuelName) : null;

  // Ленивая загрузка фактических данных при открытии модалки
  useEffect(() => {
    if (!open || !tank) return;

    let cancelled = false;
    setLoading(true);
    setResolved(null);

    (async () => {
      try {
        let fallbackPointName: string | null = null;
        let fallbackNetworkId: string | null = null;
        let fallbackPointId: string | null = null;

        for (const net of networks) {
          // 1. Станция → торговая точка (UUID) внутри этой сети
          const points = await tradingPointsService.getByNetworkId(net.id);
          const point = points.find((p) => extractStationNumber(p) === tank.station);
          if (!point) continue;

          if (!fallbackPointName) {
            fallbackPointName = point.name || `АЗС ${tank.station}`;
            fallbackNetworkId = net.id;
            fallbackPointId = point.id;
          }

          // 2. Точка → резервуары по датчику
          try {
            const tanks = await tanksService.getTanks(net.id, point.id);
            // Основное сопоставление — по номеру резервуара (Tank.id = STS tank number).
            // Резерв — по совпадению вида топлива.
            const match =
              tanks.find((t) => Number(t.id) === tank.tankNumber) ||
              tanks.find((t) => normFuel(t.fuelType) === normFuel(tank.fuelName));

            if (match) {
              if (!cancelled) {
                setResolved({
                  liveTank: match,
                  pointName: point.name || `АЗС ${tank.station}`,
                  networkId: net.id,
                  pointId: point.id,
                  reason: 'ok',
                });
                setLoading(false);
              }
              return;
            }
          } catch {
            // STS не отдал резервуары для этой точки — пробуем следующую сеть
          }
        }

        if (cancelled) return;

        if (fallbackPointName) {
          // Станция найдена, но датчик/резервуар недоступны
          setResolved({
            liveTank: null,
            pointName: fallbackPointName,
            networkId: fallbackNetworkId,
            pointId: fallbackPointId,
            reason: 'no-sensor',
          });
        } else {
          setResolved({
            liveTank: null,
            pointName: null,
            networkId: null,
            pointId: null,
            reason: 'point-not-found',
          });
        }
        setLoading(false);
      } catch {
        if (cancelled) return;
        setResolved({
          liveTank: null,
          pointName: null,
          networkId: null,
          pointId: null,
          reason: 'error',
        });
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tank?.station, tank?.tankNumber, tank?.fuelCode, networkKey]);

  if (!tank) return null;

  const live = resolved?.liveTank ?? null;
  const noSensor = !!live?.noSensorData;
  const sensorOnline = !!live && !noSensor;

  // Фактический остаток по датчику
  const factLiters = live ? live.currentLevelLiters || 0 : 0;
  const book = tank.volumeBook;

  // Показания датчика
  const levelMm = live ? parseFloat(String(live.apiData?.level ?? 0)) : 0;
  const temp = live ? live.temperature || live.apiData?.temperature || 0 : 0;
  const density = live ? live.density || live.apiData?.density || 0 : 0;
  const waterMm = live ? live.waterLevelMm || live.apiData?.water?.level || 0 : 0;
  // Масса (кг) = текущий объём × плотность / 1000 (как в разделе «Резервуары»)
  const massKg = factLiters > 0 && density > 0 ? (factLiters * density) / 1000 : 0;
  const updatedAt = live?.apiData?.dt || null;

  // Расхождение: книжный − факт. >0 → недостача (факт меньше книги), <0 → излишек.
  const canCompare = sensorOnline;
  const diff = book - factLiters;
  const diffPercent = book > 0 ? (diff / book) * 100 : null;
  const isShortage = diff > 0.5;
  const isSurplus = diff < -0.5;
  const diffColor = isShortage ? 'text-red-500' : isSurplus ? 'text-emerald-500' : 'text-foreground';

  // Ёмкость / заполнение — приоритет книжной ёмкости из строки, fallback на live
  const capacity = tank.capacity > 0 ? tank.capacity : live?.capacityLiters || 0;
  const fillPercent = tank.capacity > 0 ? tank.fillPercent : capacity > 0 ? (book / capacity) * 100 : 0;
  const freeVolume = capacity > 0 ? Math.max(0, capacity - book) : 0;

  const openInTanks = () => {
    if (resolved?.networkId && resolved?.pointId) {
      setSelectedNetwork(resolved.networkId);
      setSelectedTradingPoint(resolved.pointId);
    }
    onOpenChange(false);
    navigate('/point/tanks');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6 text-left">
            {fuel && (
              <span
                className={cn(
                  'inline-flex items-center justify-center min-w-9 rounded-md px-1.5 py-0.5 text-[11px] font-bold uppercase text-white shrink-0',
                  fuel.bg
                )}
              >
                {fuel.label}
              </span>
            )}
            <span className="truncate">
              {tank.stationName || `АЗС ${tank.station}`} · Р{tank.tankNumber}
            </span>
          </DialogTitle>
          <DialogDescription className="text-left">
            {tank.fuelName} · станция {tank.station}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Загрузка данных датчика…</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* СРАВНЕНИЕ КНИЖНЫЙ ↔ ФАКТИЧЕСКИЙ */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Книжный ↔ фактический остаток
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-secondary/60 p-3">
                  <div className="text-[11px] text-muted-foreground">Книжный (учёт)</div>
                  <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {formatNumber(book)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">л</span>
                  </div>
                </div>
                <div className="rounded-lg bg-secondary/60 p-3">
                  <div className="text-[11px] text-muted-foreground">Фактический (датчик)</div>
                  <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {canCompare ? (
                      <>
                        {formatNumber(factLiters)}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">л</span>
                      </>
                    ) : (
                      <span className="text-base font-medium text-muted-foreground">нет данных</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Расхождение */}
              {canCompare ? (
                <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    {isShortage ? (
                      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                    ) : isSurplus ? (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    ) : null}
                    Расхождение (книжн. − факт)
                  </span>
                  <span className={cn('text-sm font-bold tabular-nums', diffColor)}>
                    {formatSigned(diff)} л
                    {diffPercent != null && (
                      <span className="ml-1 text-xs font-normal">
                        ({formatSigned(diffPercent).replace(/\s/g, '')}%)
                      </span>
                    )}
                  </span>
                </div>
              ) : (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    {resolved?.reason === 'point-not-found'
                      ? 'Торговая точка для этой станции не найдена в справочнике — сравнение с датчиком недоступно.'
                      : resolved?.reason === 'error'
                        ? 'Не удалось получить данные датчика. Показан только книжный остаток.'
                        : 'Нет данных уровнемера — показан только книжный остаток.'}
                  </span>
                </div>
              )}
            </div>

            {/* ПОКАЗАНИЯ ДАТЧИКА */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Показания датчика (сейчас)
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-[11px] font-semibold',
                    sensorOnline ? 'text-emerald-500' : 'text-muted-foreground'
                  )}
                >
                  {sensorOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                  {sensorOnline ? 'онлайн' : 'датчик офлайн'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <SensorTile
                  icon={<Ruler className="h-3.5 w-3.5" />}
                  label="Уровень"
                  value={sensorOnline ? `${levelMm.toFixed(1)} мм` : '—'}
                />
                <SensorTile
                  icon={<Thermometer className="h-3.5 w-3.5" />}
                  label="Температура"
                  value={sensorOnline && temp ? `${temp.toFixed(1)} °C` : '—'}
                />
                <SensorTile
                  icon={<Gauge className="h-3.5 w-3.5" />}
                  label="Плотность"
                  value={sensorOnline && density ? `${density.toFixed(1)} кг/м³` : '—'}
                />
                <SensorTile
                  icon={<Droplet className="h-3.5 w-3.5" />}
                  label="Подтоварная вода"
                  value={sensorOnline ? (waterMm > 0 ? `${waterMm.toFixed(1)} мм` : 'нет') : '—'}
                  valueClass={sensorOnline && waterMm > 0 ? 'text-red-500' : undefined}
                />
                <SensorTile
                  icon={<Weight className="h-3.5 w-3.5" />}
                  label="Масса"
                  value={sensorOnline && massKg > 0 ? `${formatNumber(massKg)} кг` : '—'}
                />
                <SensorTile
                  icon={<Wifi className="h-3.5 w-3.5" />}
                  label="Обновлено"
                  value={
                    updatedAt
                      ? new Date(updatedAt).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'
                  }
                />
              </div>
            </div>

            {/* ДВИЖЕНИЕ ЗА ПЕРИОД */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Движение за период (книжное)
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MoveTile label="Начальный" value={`${formatNumber(tank.volumeBegin)} л`} />
                <MoveTile
                  label="Поступления"
                  value={`+${formatNumber(tank.volumeReceipts)} л`}
                  valueClass="text-emerald-500"
                />
                <MoveTile
                  label="Реализация"
                  value={`−${formatNumber(tank.volumeSales)} л`}
                  valueClass="text-primary"
                />
                <MoveTile label="Смен / ТТН" value={`${tank.shiftCount} / ${tank.receiptCount}`} />
              </div>
            </div>

            {/* ЁМКОСТЬ / ЗАПОЛНЕНИЕ */}
            {capacity > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span>Ёмкость и заполнение</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatNumber(capacity)} л
                  </span>
                </div>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span
                    className={cn(
                      'font-bold tabular-nums',
                      fillPercent < 10
                        ? 'text-red-500'
                        : fillPercent < 22
                          ? 'text-amber-500'
                          : 'text-emerald-500'
                    )}
                  >
                    {Math.round(fillPercent)}%
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    Свободно: {formatNumber(freeVolume)} л
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      fillPercent < 10
                        ? 'bg-red-500'
                        : fillPercent < 22
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    )}
                    style={{ width: `${Math.max(0, Math.min(100, fillPercent))}%` }}
                  />
                </div>
              </div>
            )}

            {/* Действие */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={openInTanks}
                disabled={!resolved?.pointId}
                title={
                  resolved?.pointId
                    ? 'Перейти в раздел «Резервуары» этой станции'
                    : 'Станция не найдена в справочнике'
                }
              >
                Открыть в разделе «Резервуары»
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SensorTile({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg bg-secondary/50 p-2.5">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={cn('mt-1 text-sm font-bold tabular-nums text-foreground', valueClass)}>
        {value}
      </div>
    </div>
  );
}

function MoveTile({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg bg-secondary/50 p-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={cn('mt-1 text-sm font-bold tabular-nums text-foreground', valueClass)}>
        {value}
      </div>
    </div>
  );
}
