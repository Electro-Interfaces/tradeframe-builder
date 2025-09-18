/**
 * CouponCard - Компонент карточки купона
 * Отображает детальную информацию о купоне с форматированием
 */

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CouponWithAge } from '@/types/coupons';
import {
  formatCurrency,
  formatDateTime,
  formatRelativeTime,
  getCouponStateClasses,
  getCouponPriorityClasses,
  getCouponStateIcon,
  getCouponPriorityIcon,
  getCouponStateDescription,
  getCouponPriorityDescription
} from '@/utils/couponsUtils';
import {
  Calendar,
  CreditCard,
  MapPin,
  Clock,
  DollarSign,
  AlertTriangle,
  Copy,
  Eye
} from 'lucide-react';

interface CouponCardProps {
  coupon: CouponWithAge;
  showActions?: boolean;
  compact?: boolean;
  onView?: (coupon: CouponWithAge) => void;
  onCopy?: (couponNumber: string) => void;
  className?: string;
}

export default function CouponCard({
  coupon,
  showActions = false,
  compact = false,
  onView,
  onCopy,
  className = ''
}: CouponCardProps) {
  const handleCopyNumber = () => {
    if (onCopy) {
      onCopy(coupon.number);
    } else {
      navigator.clipboard.writeText(coupon.number);
    }
  };

  const handleViewDetails = () => {
    if (onView) {
      onView(coupon);
    }
  };

  if (compact) {
    return (
      <Card className={`hover:shadow-md transition-shadow ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Основная информация */}
            <div className="flex items-center gap-3">
              <div className="text-2xl">
                {getCouponStateIcon(coupon.state)}
              </div>
              <div>
                <div className="font-mono font-semibold text-sm">
                  #{coupon.number}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatRelativeTime(coupon.dt_beg)}
                </div>
              </div>
            </div>

            {/* Статус и сумма */}
            <div className="text-right">
              <div className="font-semibold text-lg">
                {formatCurrency(coupon.rest)}
              </div>
              <div className="flex gap-1 justify-end">
                <Badge
                  variant="outline"
                  className={`text-xs ${getCouponStateClasses(coupon.state)}`}
                >
                  {coupon.state}
                </Badge>
                {coupon.priority !== 'normal' && (
                  <Badge
                    variant="outline"
                    className={`text-xs ${getCouponPriorityClasses(coupon.priority)}`}
                  >
                    {getCouponPriorityIcon(coupon.priority)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`hover:shadow-lg transition-all duration-200 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          {/* Номер и статус */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">
                {getCouponStateIcon(coupon.state)}
              </span>
              <div>
                <h3 className="font-mono font-bold text-lg">
                  #{coupon.number}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Купон на сдачу топливом
                </p>
              </div>
            </div>

            {/* Статусы */}
            <div className="flex gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={getCouponStateClasses(coupon.state)}
                title={getCouponStateDescription(coupon.state)}
              >
                {coupon.state}
              </Badge>

              <Badge
                variant="outline"
                className={getCouponPriorityClasses(coupon.priority)}
                title={getCouponPriorityDescription(coupon.priority)}
              >
                {getCouponPriorityIcon(coupon.priority)} {coupon.priority === 'normal' ? 'Обычный' :
                  coupon.priority === 'attention' ? 'Внимание' : 'Критический'}
              </Badge>

              {coupon.isOld && (
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                  <Clock className="w-3 h-3 mr-1" />
                  Старый
                </Badge>
              )}

              {coupon.isCritical && (
                <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Критический
                </Badge>
              )}
            </div>
          </div>

          {/* Действия */}
          {showActions && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyNumber}
                title="Скопировать номер"
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewDetails}
                title="Подробнее"
              >
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Финансовая информация */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              Остаток к использованию
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(coupon.rest)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="w-4 h-4" />
              Первоначальная сумма
            </div>
            <div className="text-lg font-semibold">
              {formatCurrency(coupon.summ_total)}
            </div>
            <div className="text-sm text-muted-foreground">
              Использовано: {formatCurrency(coupon.summ_used)}
            </div>
          </div>
        </div>

        <Separator />

        {/* Техническая информация */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Дата выдачи</div>
                <div className="text-muted-foreground">
                  {formatDateTime(coupon.dt_beg)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatRelativeTime(coupon.dt_beg)} ({coupon.ageInDays} дн.)
                </div>
              </div>
            </div>

            {coupon.dt_end && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Дата погашения</div>
                  <div className="text-muted-foreground">
                    {formatDateTime(coupon.dt_end)}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Точка выдачи</div>
                <div className="text-muted-foreground">
                  POS {coupon.pos}, Смена {coupon.shift}
                </div>
                <div className="text-xs text-muted-foreground">
                  Операция #{coupon.opernum}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Возраст</div>
                <div className="text-muted-foreground">
                  {coupon.ageInDays} дн. ({coupon.ageInHours} ч.)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Прогресс использования */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Использование купона</span>
            <span className="font-medium">
              {Math.round((coupon.summ_used / coupon.summ_total) * 100)}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min((coupon.summ_used / coupon.summ_total) * 100, 100)}%`
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Использовано: {formatCurrency(coupon.summ_used)}</span>
            <span>Остаток: {formatCurrency(coupon.rest)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}