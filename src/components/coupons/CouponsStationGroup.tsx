/**
 * CouponsStationGroup - Компонент группы купонов по станции
 * Отображает купоны сгруппированные по торговой точке
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { CouponsStationGroup as StationGroupType, CouponWithAge } from '@/types/coupons';
import { formatCurrency, formatNumber } from '@/utils/couponsUtils';
import CouponCard from './CouponCard';
import { CouponsStatsCompact } from './CouponsStatsCards';
import {
  MapPin,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Clock,
  DollarSign,
  Receipt,
  Eye,
  Filter,
  Search,
  MoreHorizontal
} from 'lucide-react';

interface CouponsStationGroupProps {
  group: StationGroupType;
  expanded?: boolean;
  showActions?: boolean;
  maxCoupons?: number;
  onToggleExpand?: (groupId: string) => void;
  onViewCoupon?: (coupon: CouponWithAge) => void;
  onCopyCouponNumber?: (couponNumber: string) => void;
  className?: string;
}

export default function CouponsStationGroupComponent({
  group,
  expanded = false,
  showActions = true,
  maxCoupons = 10,
  onToggleExpand,
  onViewCoupon,
  onCopyCouponNumber,
  className = ''
}: CouponsStationGroupProps) {
  const [localExpanded, setLocalExpanded] = useState(expanded);
  const [showAllCoupons, setShowAllCoupons] = useState(false);

  const isExpanded = onToggleExpand ? expanded : localExpanded;

  const handleToggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand(`${group.systemId}-${group.stationId}`);
    } else {
      setLocalExpanded(!localExpanded);
    }
  };

  const handleViewAll = () => {
    setShowAllCoupons(!showAllCoupons);
  };

  // Определяем какие купоны показывать
  const couponsToShow = showAllCoupons
    ? group.coupons
    : group.coupons.slice(0, maxCoupons);

  const hasMoreCoupons = group.coupons.length > maxCoupons;

  // Группировка купонов по приоритету для лучшего отображения
  const sortedCoupons = [...couponsToShow].sort((a, b) => {
    // Сначала критические, потом attention, потом normal
    const priorityOrder = { critical: 0, attention: 1, normal: 2 };
    const aPriority = priorityOrder[a.priority];
    const bPriority = priorityOrder[b.priority];

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    // Внутри приоритета сортируем по возрасту (старые первые)
    return b.ageInDays - a.ageInDays;
  });

  // Получение цвета для индикатора состояния станции
  const getStationStatusColor = () => {
    if (group.criticalCouponsCount > 0) return 'border-l-red-500';
    if (group.oldCouponsCount > 0) return 'border-l-amber-500';
    if (group.totalDebt > 5000) return 'border-l-orange-500';
    return 'border-l-green-500';
  };

  return (
    <Card className={`${getStationStatusColor()} border-l-4 hover:shadow-lg transition-all duration-200 ${className}`}>
      <Collapsible open={isExpanded} onOpenChange={handleToggleExpand}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                </div>

                <div>
                  <CardTitle className="text-lg font-semibold">
                    {group.stationName}
                  </CardTitle>
                  <div className="text-sm text-muted-foreground">
                    Система {group.systemId} • Станция {group.stationId}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Ключевые показатели */}
                <div className="hidden md:flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-red-500" />
                    <span className="font-semibold text-red-600">
                      {formatCurrency(group.totalDebt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Receipt className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">
                      {group.activeCouponsCount}/{group.totalCouponsCount}
                    </span>
                  </div>

                  {group.oldCouponsCount > 0 && (
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                      <Clock className="h-3 w-3 mr-1" />
                      {group.oldCouponsCount}
                    </Badge>
                  )}

                  {group.criticalCouponsCount > 0 && (
                    <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {group.criticalCouponsCount}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Компактная статистика для мобильных */}
            <div className="md:hidden mt-2">
              <div className="flex items-center gap-4 text-sm">
                <span className="font-semibold text-red-600">
                  {formatCurrency(group.totalDebt)}
                </span>
                <span>
                  {group.activeCouponsCount}/{group.totalCouponsCount} купонов
                </span>
                {(group.oldCouponsCount > 0 || group.criticalCouponsCount > 0) && (
                  <span className="text-amber-600">
                    {group.oldCouponsCount + group.criticalCouponsCount} проблемных
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <Separator className="mb-4" />

            {/* Детальная статистика */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(group.totalDebt)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Общая задолженность
                </div>
              </div>

              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {group.activeCouponsCount}
                </div>
                <div className="text-xs text-muted-foreground">
                  Активных купонов
                </div>
              </div>

              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">
                  {group.oldCouponsCount}
                </div>
                <div className="text-xs text-muted-foreground">
                  Старых купонов
                </div>
              </div>

              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {group.criticalCouponsCount}
                </div>
                <div className="text-xs text-muted-foreground">
                  Критических
                </div>
              </div>
            </div>

            {/* Действия */}
            {showActions && (
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Фильтры
                  </Button>
                  <Button variant="outline" size="sm">
                    <Search className="h-4 w-4 mr-2" />
                    Поиск
                  </Button>
                </div>

                <div className="flex gap-2">
                  {hasMoreCoupons && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleViewAll}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {showAllCoupons
                        ? `Показать меньше`
                        : `Показать все (${group.coupons.length})`
                      }
                    </Button>
                  )}

                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Список купонов */}
            {sortedCoupons.length > 0 ? (
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Купоны ({couponsToShow.length} из {group.coupons.length})
                </h4>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {sortedCoupons.map((coupon, index) => (
                    <CouponCard
                      key={`${coupon.number}-${index}`}
                      coupon={coupon}
                      compact={true}
                      showActions={showActions}
                      onView={onViewCoupon}
                      onCopy={onCopyCouponNumber}
                    />
                  ))}
                </div>

                {hasMoreCoupons && !showAllCoupons && (
                  <div className="text-center py-4">
                    <Button
                      variant="ghost"
                      onClick={handleViewAll}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Показать ещё {group.coupons.length - maxCoupons} купонов
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p>Нет купонов для отображения</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// Компонент для отображения списка всех групп станций
interface CouponsStationGroupsProps {
  groups: StationGroupType[];
  expandedGroups?: Set<string>;
  onToggleGroup?: (groupId: string) => void;
  onViewCoupon?: (coupon: CouponWithAge) => void;
  onCopyCouponNumber?: (couponNumber: string) => void;
  className?: string;
}

export function CouponsStationGroups({
  groups,
  expandedGroups = new Set(),
  onToggleGroup,
  onViewCoupon,
  onCopyCouponNumber,
  className = ''
}: CouponsStationGroupsProps) {
  // Сортируем группы по размеру задолженности (проблемные первые)
  const sortedGroups = [...groups].sort((a, b) => {
    // Сначала по критическим купонам
    if (a.criticalCouponsCount !== b.criticalCouponsCount) {
      return b.criticalCouponsCount - a.criticalCouponsCount;
    }

    // Потом по старым купонам
    if (a.oldCouponsCount !== b.oldCouponsCount) {
      return b.oldCouponsCount - a.oldCouponsCount;
    }

    // Затем по размеру задолженности
    return b.totalDebt - a.totalDebt;
  });

  return (
    <div className={`space-y-4 ${className}`}>
      {sortedGroups.map((group) => (
        <CouponsStationGroupComponent
          key={`${group.systemId}-${group.stationId}`}
          group={group}
          expanded={expandedGroups.has(`${group.systemId}-${group.stationId}`)}
          onToggleExpand={onToggleGroup}
          onViewCoupon={onViewCoupon}
          onCopyCouponNumber={onCopyCouponNumber}
        />
      ))}

      {groups.length === 0 && (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p>Нет данных для отображения</p>
          </div>
        </Card>
      )}
    </div>
  );
}