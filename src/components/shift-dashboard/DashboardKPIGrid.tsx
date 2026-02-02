/**
 * Компонент сетки KPI карточек для дашборда
 *
 * Отображает метрики по видам топлива и способам оплаты
 */

import { useState } from 'react';
import { Fuel, Banknote, CreditCard, Smartphone, Building2, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardKPIs, DashboardTrends, FuelVolumeItem, PaymentFuelBreakdown } from '@/types/shift-dashboard';
import type { ShiftDetails } from '@/types/shift-reports-v2';
import { KPIDetailModal, type KPIDetailType } from './KPIDetailModal';

interface DashboardKPIGridProps {
  /** KPI метрики */
  kpis: DashboardKPIs;

  /** Тренды (опционально) */
  trends?: DashboardTrends;

  /** Смены для детализации */
  shifts?: ShiftDetails[];

  /** Флаг загрузки */
  isLoading?: boolean;

  /** Дополнительный класс */
  className?: string;
}

/**
 * Форматирует валюту (до копеек)
 */
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Форматирует объем (до сотых литра)
 */
const formatVolume = (value: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Карточка топлива
 */
interface FuelCardProps {
  fuel: FuelVolumeItem;
  isLoading?: boolean;
  onClick?: () => void;
}

function FuelCard({ fuel, isLoading, onClick }: FuelCardProps) {
  return (
    <div
      className="bg-slate-800 rounded-xl p-3 sm:p-4 border border-slate-700 cursor-pointer hover:border-slate-500 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        <div
          className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: fuel.color || '#3b82f6' }}
        />
        <span className="text-xs sm:text-sm font-medium text-white truncate">{fuel.fuelName}</span>
        <span className="text-[10px] sm:text-xs text-slate-500 ml-auto flex-shrink-0">{fuel.percentOfTotal.toFixed(1)}%</span>
      </div>

      {isLoading ? (
        <div className="space-y-1.5 sm:space-y-2">
          <div className="h-5 sm:h-6 w-20 sm:w-24 bg-slate-700 rounded animate-pulse" />
          <div className="h-4 w-16 sm:w-20 bg-slate-700 rounded animate-pulse" />
        </div>
      ) : (
        <div className="space-y-0.5 sm:space-y-1">
          <div className="flex items-baseline gap-1 sm:gap-2">
            <span className="text-base sm:text-xl font-bold text-white">{formatCurrency(fuel.revenue)}</span>
            <span className="text-[10px] sm:text-xs text-slate-400">₽</span>
          </div>
          <div className="flex items-baseline gap-1 sm:gap-2">
            <span className="text-sm sm:text-lg text-blue-400">{formatVolume(fuel.volume)}</span>
            <span className="text-[10px] sm:text-xs text-slate-400">л</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Карточка способа оплаты с разбивкой по топливам
 */
interface PaymentCardProps {
  title: string;
  revenue: number;
  volume: number;
  byFuel: PaymentFuelBreakdown[];
  icon: React.ReactNode;
  iconBg: string;
  isLoading?: boolean;
  onClick?: () => void;
  volumeOnly?: boolean; // Для корп.карт, онлайн и купонов - показывать только литры (без выручки)
}

function PaymentCard({ title, revenue, volume, byFuel, icon, iconBg, isLoading, onClick, volumeOnly }: PaymentCardProps) {
  return (
    <div
      className="bg-slate-800 rounded-xl p-3 sm:p-4 border border-slate-700 cursor-pointer hover:border-slate-500 transition-colors"
      onClick={onClick}
    >
      {/* Заголовок с иконкой */}
      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        <div className={cn('p-1 sm:p-1.5 rounded-lg', iconBg)}>
          {icon}
        </div>
        <span className="text-xs sm:text-sm font-medium text-white truncate">{title}</span>
      </div>

      {isLoading ? (
        <div className="space-y-1.5 sm:space-y-2">
          <div className="h-5 sm:h-6 w-20 sm:w-24 bg-slate-700 rounded animate-pulse" />
          <div className="h-4 w-16 sm:w-20 bg-slate-700 rounded animate-pulse" />
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {/* Разбивка по топливам - скрыта на мобильных */}
          {byFuel.length > 0 && (
            <div className="hidden sm:block space-y-1.5 pb-2 border-b border-slate-700">
              {byFuel.map((fuel) => (
                <div key={fuel.fuelCode} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: fuel.color || '#3b82f6' }}
                    />
                    <span className="text-slate-400">{fuel.fuelName}</span>
                  </div>
                  {/* Для volumeOnly показываем только литры */}
                  {volumeOnly ? (
                    <span className="text-blue-400">{formatVolume(fuel.volume)} л</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300">{formatCurrency(fuel.revenue)} ₽</span>
                      <span className="text-slate-500">|</span>
                      <span className="text-blue-400">{formatVolume(fuel.volume)} л</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Итого */}
          <div className="sm:pt-1">
            <div className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">
              {volumeOnly ? 'ОТПУЩЕНО' : 'ИТОГО'}
            </div>
            {/* Для volumeOnly показываем только литры крупным шрифтом */}
            {volumeOnly ? (
              <div className="flex items-baseline gap-1">
                <span className="text-base sm:text-lg font-bold text-blue-400">{formatVolume(volume)}</span>
                <span className="text-[10px] sm:text-xs text-slate-400">л</span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-base sm:text-lg font-bold text-white">{formatCurrency(revenue)}</span>
                  <span className="text-[10px] sm:text-xs text-slate-400">₽</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm sm:text-base text-blue-400">{formatVolume(volume)}</span>
                  <span className="text-[10px] sm:text-xs text-slate-400">л</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Итоговая карточка
 */
function TotalCard({
  title,
  revenue,
  volume,
  isLoading
}: {
  title: string;
  revenue: number;
  volume: number;
  isLoading?: boolean;
}) {
  return (
    <div className="bg-gradient-to-br from-blue-900/50 to-slate-800 rounded-xl p-3 sm:p-4 border border-blue-700/50">
      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        <Fuel className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
        <span className="text-xs sm:text-sm font-bold text-white">{title}</span>
      </div>

      {isLoading ? (
        <div className="space-y-1.5 sm:space-y-2">
          <div className="h-6 sm:h-8 w-24 sm:w-32 bg-slate-700 rounded animate-pulse" />
          <div className="h-5 sm:h-6 w-20 sm:w-28 bg-slate-700 rounded animate-pulse" />
        </div>
      ) : (
        <div className="space-y-0.5 sm:space-y-1">
          <div className="flex items-baseline gap-1 sm:gap-2">
            <span className="text-lg sm:text-2xl font-bold text-white">{formatCurrency(revenue)}</span>
            <span className="text-xs sm:text-sm text-slate-400">₽</span>
          </div>
          <div className="flex items-baseline gap-1 sm:gap-2">
            <span className="text-base sm:text-xl text-blue-400">{formatVolume(volume)}</span>
            <span className="text-xs sm:text-sm text-slate-400">л</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Состояние модального окна
 */
interface ModalState {
  isOpen: boolean;
  type: KPIDetailType;
  title: string;
  code: number | string;
  color?: string;
}

/**
 * Сетка KPI карточек
 */
export function DashboardKPIGrid({ kpis, trends, shifts, isLoading, className }: DashboardKPIGridProps) {
  // Состояние модального окна детализации
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    type: 'fuel',
    title: '',
    code: 0,
  });

  // Открытие модального окна для топлива
  const openFuelModal = (fuel: FuelVolumeItem) => {
    setModalState({
      isOpen: true,
      type: 'fuel',
      title: fuel.fuelName,
      code: fuel.fuelCode,
      color: fuel.color,
    });
  };

  // Открытие модального окна для способа оплаты
  const openPaymentModal = (title: string, paymentType: string) => {
    setModalState({
      isOpen: true,
      type: 'payment',
      title,
      code: paymentType,
    });
  };

  // Закрытие модального окна
  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  // Получаем детализацию по способам оплаты
  const paymentDetails = kpis.financial.paymentDetails;

  // Данные по способам оплаты с разбивкой по топливам
  const paymentMethods = [
    {
      title: 'Наличные',
      paymentType: 'cash',
      revenue: paymentDetails?.cash?.revenue ?? kpis.financial.cashRevenue,
      volume: paymentDetails?.cash?.volume ?? 0,
      byFuel: paymentDetails?.cash?.byFuel ?? [],
      icon: <Banknote className="w-4 h-4 text-white" />,
      iconBg: 'bg-emerald-600',
    },
    {
      title: 'Банковские карты',
      paymentType: 'card',
      revenue: paymentDetails?.card?.revenue ?? kpis.financial.cardRevenue,
      volume: paymentDetails?.card?.volume ?? 0,
      byFuel: paymentDetails?.card?.byFuel ?? [],
      icon: <CreditCard className="w-4 h-4 text-white" />,
      iconBg: 'bg-blue-600',
    },
    {
      title: 'Онлайн заказы',
      paymentType: 'online',
      revenue: paymentDetails?.online?.revenue ?? kpis.financial.sbpRevenue,
      volume: paymentDetails?.online?.volume ?? 0,
      byFuel: paymentDetails?.online?.byFuel ?? [],
      icon: <Smartphone className="w-4 h-4 text-white" />,
      iconBg: 'bg-purple-600',
      volumeOnly: true, // Онлайн заказы - только отпуск топлива, не выручка
    },
    {
      title: 'Корп. карты',
      paymentType: 'corporate',
      revenue: paymentDetails?.corporate?.revenue ?? ((kpis.financial.corporateCardRevenue || 0) + (kpis.financial.fuelCardRevenue || 0)),
      volume: paymentDetails?.corporate?.volume ?? 0,
      byFuel: paymentDetails?.corporate?.byFuel ?? [],
      icon: <Building2 className="w-4 h-4 text-white" />,
      iconBg: 'bg-orange-600',
      volumeOnly: true, // Корп. карты - отпуск по договорам, не выручка в кассе
    },
    {
      title: 'Купоны',
      paymentType: 'coupon',
      revenue: paymentDetails?.coupon?.revenue ?? 0,
      volume: paymentDetails?.coupon?.volume ?? 0,
      byFuel: paymentDetails?.coupon?.byFuel ?? [],
      icon: <Ticket className="w-4 h-4 text-white" />,
      iconBg: 'bg-amber-600',
      volumeOnly: true, // Купоны - отпуск по ранее оплаченным купонам, не выручка
    },
  ];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Секция: По видам топлива */}
      <div>
        <h3 className="text-xs sm:text-sm font-medium text-slate-400 mb-2 sm:mb-3 uppercase tracking-wide">
          По видам топлива
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
          {/* Карточки по топливам */}
          {kpis.volume.byFuel.map((fuel) => (
            <FuelCard
              key={fuel.fuelCode}
              fuel={fuel}
              isLoading={isLoading}
              onClick={() => shifts && shifts.length > 0 && openFuelModal(fuel)}
            />
          ))}

          {/* Итого по топливам */}
          <TotalCard
            title="ИТОГО"
            revenue={kpis.financial.totalRevenue}
            volume={kpis.volume.totalVolume}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Секция: По способам оплаты */}
      <div>
        <h3 className="text-xs sm:text-sm font-medium text-slate-400 mb-2 sm:mb-3 uppercase tracking-wide">
          По способам оплаты
        </h3>
        {/* Наличные и Карты - широкие, Онлайн/Корп/Купоны - узкие */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          {paymentMethods.map((method) => (
            <PaymentCard
              key={method.title}
              title={method.title}
              revenue={method.revenue}
              volume={method.volume}
              byFuel={method.byFuel}
              icon={method.icon}
              iconBg={method.iconBg}
              isLoading={isLoading}
              onClick={() => shifts && shifts.length > 0 && openPaymentModal(method.title, method.paymentType)}
              volumeOnly={method.volumeOnly}
            />
          ))}
        </div>
      </div>

      {/* Модальное окно детализации */}
      {shifts && shifts.length > 0 && (
        <KPIDetailModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          type={modalState.type}
          title={modalState.title}
          code={modalState.code}
          color={modalState.color}
          shifts={shifts}
        />
      )}
    </div>
  );
}

export default DashboardKPIGrid;
