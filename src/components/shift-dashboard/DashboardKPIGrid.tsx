/**
 * Компонент сетки KPI карточек для дашборда
 *
 * Отображает метрики по видам топлива и способам оплаты
 */

import { useState, useMemo } from 'react';
import { Fuel, Banknote, CreditCard, Smartphone, Building2, Ticket, Wallet, CircleDollarSign } from 'lucide-react';
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
      className="bg-card rounded-xl p-3 sm:p-4 border border-border cursor-pointer hover:border-border transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        <div
          className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: fuel.color || '#3b82f6' }}
        />
        <span className="text-xs sm:text-sm font-medium text-foreground truncate">{fuel.fuelName}</span>
        <span className="text-[10px] sm:text-xs text-muted-foreground ml-auto flex-shrink-0">{fuel.percentOfTotal.toFixed(1)}%</span>
      </div>

      {isLoading ? (
        <div className="space-y-1.5 sm:space-y-2">
          <div className="h-5 sm:h-6 w-20 sm:w-24 bg-secondary rounded animate-pulse" />
          <div className="h-4 w-16 sm:w-20 bg-secondary rounded animate-pulse" />
        </div>
      ) : (
        <div className="space-y-0.5 sm:space-y-1">
          <div className="flex items-baseline gap-1 sm:gap-2">
            <span className="text-base sm:text-xl font-bold text-foreground">{formatCurrency(fuel.revenue)}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">₽</span>
          </div>
          <div className="flex items-baseline gap-1 sm:gap-2">
            <span className="text-sm sm:text-lg text-blue-600 dark:text-blue-400">{formatVolume(fuel.volume)}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">л</span>
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
      className="bg-card rounded-xl p-3 sm:p-4 border border-border cursor-pointer hover:border-border transition-colors"
      onClick={onClick}
    >
      {/* Заголовок с иконкой */}
      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        <div className={cn('p-1 sm:p-1.5 rounded-lg', iconBg)}>
          {icon}
        </div>
        <span className="text-xs sm:text-sm font-medium text-foreground truncate">{title}</span>
      </div>

      {isLoading ? (
        <div className="space-y-1.5 sm:space-y-2">
          <div className="h-5 sm:h-6 w-20 sm:w-24 bg-secondary rounded animate-pulse" />
          <div className="h-4 w-16 sm:w-20 bg-secondary rounded animate-pulse" />
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {/* Разбивка по топливам - скрыта на мобильных */}
          {byFuel.length > 0 && (
            <div className="hidden sm:block space-y-1.5 pb-2 border-b border-border">
              {byFuel.map((fuel) => (
                <div key={fuel.fuelCode} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: fuel.color || '#3b82f6' }}
                    />
                    <span className="text-muted-foreground">{fuel.fuelName}</span>
                  </div>
                  {/* Для volumeOnly показываем только литры */}
                  {volumeOnly ? (
                    <span className="text-blue-600 dark:text-blue-400">{formatVolume(fuel.volume)} л</span>
                  ) : (
                    <div className="text-right">
                      <div className="text-foreground/80">{formatCurrency(fuel.revenue)} ₽</div>
                      <div className="text-blue-600 dark:text-blue-400">{formatVolume(fuel.volume)} л</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Итого */}
          <div className="sm:pt-1">
            <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">
              {volumeOnly ? 'ОТПУЩЕНО' : 'ИТОГО'}
            </div>
            {/* Для volumeOnly показываем только литры крупным шрифтом */}
            {volumeOnly ? (
              <div className="flex items-baseline gap-1">
                <span className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">{formatVolume(volume)}</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">л</span>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                <div className="flex items-baseline gap-1 min-w-0">
                  <span className="text-base sm:text-lg font-bold text-foreground truncate">{formatCurrency(revenue)}</span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground flex-shrink-0">₽</span>
                </div>
                <div className="flex items-baseline gap-1 min-w-0">
                  <span className="text-sm sm:text-base text-blue-600 dark:text-blue-400 truncate">{formatVolume(volume)}</span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground flex-shrink-0">л</span>
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
    <div className="bg-gradient-to-br from-blue-50 dark:from-blue-900/50 to-card rounded-xl p-3 sm:p-4 border border-blue-300 dark:border-blue-700/50">
      <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
        <Fuel className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
        <span className="text-xs sm:text-sm font-bold text-foreground">{title}</span>
      </div>

      {isLoading ? (
        <div className="space-y-1.5 sm:space-y-2">
          <div className="h-6 sm:h-8 w-24 sm:w-32 bg-secondary rounded animate-pulse" />
          <div className="h-5 sm:h-6 w-20 sm:w-28 bg-secondary rounded animate-pulse" />
        </div>
      ) : (
        <div className="space-y-0.5 sm:space-y-1 min-w-0">
          <div className="flex items-baseline gap-1 sm:gap-2 min-w-0">
            <span className="text-base sm:text-2xl font-bold text-foreground truncate">{formatCurrency(revenue)}</span>
            <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">₽</span>
          </div>
          <div className="flex items-baseline gap-1 sm:gap-2 min-w-0">
            <span className="text-sm sm:text-xl text-blue-600 dark:text-blue-400 truncate">{formatVolume(volume)}</span>
            <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">л</span>
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

  // Мемоизация вычисления paymentMethods — зависит только от kpis.financial
  const paymentMethods = useMemo(() => {
    const paymentDetails = kpis.financial.paymentDetails || {};

    // Конфигурация иконок и стилей для известных типов
    const paymentTypeConfig: Record<string, {
      title: string;
      icon: React.ReactNode;
      iconBg: string;
      volumeOnly?: boolean;
    }> = {
      cash: { title: 'Наличные', icon: <Banknote className="w-4 h-4 text-foreground" />, iconBg: 'bg-emerald-600' },
      card: { title: 'Банковские карты', icon: <CreditCard className="w-4 h-4 text-foreground" />, iconBg: 'bg-blue-600' },
      fuel_card: { title: 'Топл. карты', icon: <CreditCard className="w-4 h-4 text-foreground" />, iconBg: 'bg-amber-600', volumeOnly: true },
      online: { title: 'Онлайн заказы', icon: <Smartphone className="w-4 h-4 text-foreground" />, iconBg: 'bg-purple-600', volumeOnly: true },
      corporate: { title: 'Корп. карты', icon: <Building2 className="w-4 h-4 text-foreground" />, iconBg: 'bg-orange-600', volumeOnly: true },
      coupon: { title: 'Купоны/Талоны', icon: <Ticket className="w-4 h-4 text-foreground" />, iconBg: 'bg-amber-600', volumeOnly: true },
    };

    const knownOrder = ['cash', 'card', 'fuel_card', 'online', 'corporate', 'coupon'];
    const allTypes = Object.keys(paymentDetails);
    const orderedTypes = [
      ...knownOrder.filter(t => allTypes.includes(t)),
      ...allTypes.filter(t => !knownOrder.includes(t)),
    ];

    const methods = orderedTypes
      .filter(paymentType => {
        const details = paymentDetails[paymentType];
        return details && (details.revenue > 0 || details.volume > 0);
      })
      .map(paymentType => {
        const details = paymentDetails[paymentType];
        const config = paymentTypeConfig[paymentType];
        return {
          title: config?.title || paymentType,
          paymentType,
          revenue: details.revenue,
          volume: details.volume,
          byFuel: details.byFuel || [],
          icon: config?.icon || <CircleDollarSign className="w-4 h-4 text-foreground" />,
          iconBg: config?.iconBg || 'bg-secondary',
          volumeOnly: config?.volumeOnly ?? false,
        };
      });

    // Fallback: если paymentDetails пустой, генерируем из legacy-полей
    if (methods.length === 0) {
      const legacyMethods = [
        { title: 'Наличные', paymentType: 'cash', revenue: kpis.financial.cashRevenue, volume: 0, byFuel: [] as PaymentFuelBreakdown[], icon: <Banknote className="w-4 h-4 text-foreground" />, iconBg: 'bg-emerald-600', volumeOnly: false },
        { title: 'Банковские карты', paymentType: 'card', revenue: kpis.financial.cardRevenue, volume: 0, byFuel: [] as PaymentFuelBreakdown[], icon: <CreditCard className="w-4 h-4 text-foreground" />, iconBg: 'bg-blue-600', volumeOnly: false },
        { title: 'Онлайн', paymentType: 'online', revenue: kpis.financial.sbpRevenue, volume: 0, byFuel: [] as PaymentFuelBreakdown[], icon: <Smartphone className="w-4 h-4 text-foreground" />, iconBg: 'bg-purple-600', volumeOnly: true },
        { title: 'Корп. карты', paymentType: 'corporate', revenue: (kpis.financial.corporateCardRevenue || 0) + (kpis.financial.fuelCardRevenue || 0), volume: 0, byFuel: [] as PaymentFuelBreakdown[], icon: <Building2 className="w-4 h-4 text-foreground" />, iconBg: 'bg-orange-600', volumeOnly: true },
      ].filter(m => m.revenue > 0);
      methods.push(...legacyMethods);
    }

    return methods;
  }, [kpis.financial]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Секция: По видам топлива */}
      <div>
        <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 sm:mb-3 uppercase tracking-wide">
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
        <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 sm:mb-3 uppercase tracking-wide">
          По способам оплаты
        </h3>
        {/* Динамическая сетка: адаптируется к количеству способов оплаты */}
        <div className={cn(
          'grid gap-2 sm:gap-3',
          paymentMethods.length <= 3 ? 'grid-cols-2 sm:grid-cols-3' :
          paymentMethods.length <= 5 ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-5' :
          paymentMethods.length <= 6 ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-6' :
          'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7',
        )}>
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
