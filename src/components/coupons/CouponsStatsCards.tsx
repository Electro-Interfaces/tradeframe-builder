/**
 * CouponsStatsCards - Компонент карточек статистики купонов
 * Отображает ключевые показатели в удобном формате
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CouponsStats } from '@/types/coupons';
import { formatCurrency, formatNumber, formatPercentage } from '@/utils/couponsUtils';
import {
  DollarSign,
  Receipt,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
  Target,
  BarChart3,
  PieChart,
  Users
} from 'lucide-react';

interface CouponsStatsCardsProps {
  stats: CouponsStats;
  showProgress?: boolean;
  compact?: boolean;
  className?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  progress?: number;
  trend?: 'up' | 'down' | 'stable';
  compact?: boolean;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  bgColor,
  progress,
  trend,
  compact = false
}: StatCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-green-500" />;
      case 'down':
        return <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />;
      default:
        return null;
    }
  };

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${bgColor}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  {title}
                </div>
                <div className="text-xl font-bold">
                  {typeof value === 'number' ? formatNumber(value) : value}
                </div>
              </div>
            </div>
            {trend && getTrendIcon()}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold">
              {typeof value === 'number' ? formatNumber(value) : value}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {trend && (
            <div className="flex items-center gap-1">
              {getTrendIcon()}
            </div>
          )}
        </div>
        {progress !== undefined && (
          <div className="mt-3">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(progress)}% от общего числа
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CouponsStatsCards({
  stats,
  showProgress = true,
  compact = false,
  className = ''
}: CouponsStatsCardsProps) {
  // Расчет процентов для прогресс-баров
  const activePercentage = stats.totalCoupons > 0
    ? (stats.activeCoupons / stats.totalCoupons) * 100
    : 0;

  const redeemedPercentage = stats.totalCoupons > 0
    ? (stats.redeemedCoupons / stats.totalCoupons) * 100
    : 0;

  const oldPercentage = stats.totalCoupons > 0
    ? (stats.oldCouponsCount / stats.totalCoupons) * 100
    : 0;

  const criticalPercentage = stats.totalCoupons > 0
    ? (stats.criticalCouponsCount / stats.totalCoupons) * 100
    : 0;

  const usagePercentage = stats.totalAmount > 0
    ? (stats.usedAmount / stats.totalAmount) * 100
    : 0;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className}`}>
      {/* Общее количество купонов */}
      <StatCard
        title="Всего купонов"
        value={stats.totalCoupons}
        subtitle="В системе"
        icon={Receipt}
        color="text-blue-600"
        bgColor="bg-blue-100"
        compact={compact}
      />

      {/* Активные купоны */}
      <StatCard
        title="Активные купоны"
        value={stats.activeCoupons}
        subtitle={`${formatPercentage(stats.activeCoupons, stats.totalCoupons)} от общего`}
        icon={CheckCircle}
        color="text-green-600"
        bgColor="bg-green-100"
        progress={showProgress ? activePercentage : undefined}
        compact={compact}
      />

      {/* Погашенные купоны */}
      <StatCard
        title="Погашенные купоны"
        value={stats.redeemedCoupons}
        subtitle={`${formatPercentage(stats.redeemedCoupons, stats.totalCoupons)} от общего`}
        icon={Target}
        color="text-gray-600"
        bgColor="bg-gray-100"
        progress={showProgress ? redeemedPercentage : undefined}
        compact={compact}
      />

      {/* Общая задолженность */}
      <StatCard
        title="Общая задолженность"
        value={formatCurrency(stats.totalDebt)}
        subtitle="К доплате клиентами"
        icon={DollarSign}
        color="text-red-600"
        bgColor="bg-red-100"
        compact={compact}
      />

      {/* Общая сумма купонов */}
      <StatCard
        title="Общая сумма"
        value={formatCurrency(stats.totalAmount)}
        subtitle="Всех выданных купонов"
        icon={BarChart3}
        color="text-purple-600"
        bgColor="bg-purple-100"
        compact={compact}
      />

      {/* Использованная сумма */}
      <StatCard
        title="Использовано"
        value={formatCurrency(stats.usedAmount)}
        subtitle={`${formatPercentage(stats.usedAmount, stats.totalAmount)} от общей суммы`}
        icon={PieChart}
        color="text-indigo-600"
        bgColor="bg-indigo-100"
        progress={showProgress ? usagePercentage : undefined}
        compact={compact}
      />

      {/* Средний остаток */}
      <StatCard
        title="Средний остаток"
        value={formatCurrency(stats.averageRest)}
        subtitle="На активный купон"
        icon={Users}
        color="text-teal-600"
        bgColor="bg-teal-100"
        compact={compact}
      />

      {/* Старые купоны */}
      <StatCard
        title="Старые купоны"
        value={stats.oldCouponsCount}
        subtitle={`${formatPercentage(stats.oldCouponsCount, stats.totalCoupons)} от общего`}
        icon={Clock}
        color="text-amber-600"
        bgColor="bg-amber-100"
        progress={showProgress ? oldPercentage : undefined}
        trend={stats.oldCouponsCount > 0 ? 'up' : 'stable'}
        compact={compact}
      />

      {/* Критические купоны */}
      <StatCard
        title="Критические купоны"
        value={stats.criticalCouponsCount}
        subtitle={`${formatPercentage(stats.criticalCouponsCount, stats.totalCoupons)} от общего`}
        icon={AlertTriangle}
        color="text-red-600"
        bgColor="bg-red-100"
        progress={showProgress ? criticalPercentage : undefined}
        trend={stats.criticalCouponsCount > 0 ? 'up' : 'stable'}
        compact={compact}
      />
    </div>
  );
}

// Компонент краткой статистики для заголовков
export function CouponsStatsCompact({ stats }: { stats: CouponsStats }) {
  return (
    <div className="flex gap-6 text-sm">
      <div className="flex items-center gap-2">
        <Receipt className="w-4 h-4 text-blue-500" />
        <span className="font-medium">{formatNumber(stats.totalCoupons)}</span>
        <span className="text-muted-foreground">всего</span>
      </div>

      <div className="flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-green-500" />
        <span className="font-medium">{formatNumber(stats.activeCoupons)}</span>
        <span className="text-muted-foreground">активных</span>
      </div>

      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-red-500" />
        <span className="font-medium">{formatCurrency(stats.totalDebt)}</span>
        <span className="text-muted-foreground">долг</span>
      </div>

      {stats.oldCouponsCount > 0 && (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          <span className="font-medium">{formatNumber(stats.oldCouponsCount)}</span>
          <span className="text-muted-foreground">старых</span>
        </div>
      )}

      {stats.criticalCouponsCount > 0 && (
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="font-medium">{formatNumber(stats.criticalCouponsCount)}</span>
          <span className="text-muted-foreground">критических</span>
        </div>
      )}
    </div>
  );
}