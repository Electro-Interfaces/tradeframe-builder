import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface KPIShiftCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  trend?: number; // Процент изменения
  isActive?: boolean;
  isMobile?: boolean;
  onClick?: () => void;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

const colorClasses = {
  blue: {
    active: 'bg-slate-700 border-blue-500 border-2 shadow-[inset_0_-16px_0_0_rgb(59_130_246)]',
    icon: 'text-blue-400',
  },
  green: {
    active: 'bg-slate-700 border-green-500 border-2 shadow-[inset_0_-16px_0_0_rgb(34_197_94)]',
    icon: 'text-green-400',
  },
  purple: {
    active: 'bg-slate-700 border-purple-500 border-2 shadow-[inset_0_-16px_0_0_rgb(168_85_247)]',
    icon: 'text-purple-400',
  },
  orange: {
    active: 'bg-slate-700 border-orange-500 border-2 shadow-[inset_0_-16px_0_0_rgb(249_115_22)]',
    icon: 'text-orange-400',
  },
  red: {
    active: 'bg-slate-700 border-red-500 border-2 shadow-[inset_0_-16px_0_0_rgb(239_68_68)]',
    icon: 'text-red-400',
  },
};

const KPIShiftCard = React.memo(({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  isActive = false,
  isMobile = false,
  onClick,
  color = 'blue',
}: KPIShiftCardProps) => {
  const handleClick = React.useCallback(() => {
    if (onClick) onClick();
  }, [onClick]);

  const colors = colorClasses[color];

  if (isMobile) {
    return (
      <Card
        className={`transition-all duration-300 ${
          onClick ? 'cursor-pointer hover:shadow-lg' : ''
        } ${
          isActive
            ? colors.active
            : 'bg-slate-800 border-slate-600 hover:bg-slate-700'
        }`}
        onClick={onClick ? handleClick : undefined}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-slate-400 text-xs mb-1 truncate">{title}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-white text-lg font-semibold">{value}</span>
                {trend !== undefined && (
                  <span
                    className={`text-xs font-medium ${
                      trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-slate-400'
                    }`}
                  >
                    {trend > 0 ? '+' : ''}{trend}%
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-slate-400 text-xs mt-1">{subtitle}</p>
              )}
            </div>
            <Icon className={`w-8 h-8 flex-shrink-0 ml-3 ${colors.icon}`} />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Desktop version
  return (
    <Card
      className={`transition-all duration-300 ${
        onClick ? 'cursor-pointer hover:shadow-lg' : ''
      } ${
        isActive
          ? colors.active
          : 'bg-slate-800 border-slate-600 hover:bg-slate-700'
      }`}
      onClick={onClick ? handleClick : undefined}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          <Icon className={`w-6 h-6 ${colors.icon}`} />
        </div>
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-white text-2xl font-bold">{value}</span>
            {trend !== undefined && (
              <span
                className={`text-sm font-medium ${
                  trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-slate-400'
                }`}
              >
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-slate-400 text-xs">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

KPIShiftCard.displayName = 'KPIShiftCard';

export default KPIShiftCard;
