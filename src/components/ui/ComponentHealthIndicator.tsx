import React from 'react';
import { CircleCheck, AlertCircle, XCircle } from 'lucide-react';
import { ComponentHealthStatus } from '@/services/equipment';
import { cn } from '@/lib/utils';

interface ComponentHealthIndicatorProps {
  status: ComponentHealthStatus;
  componentCount: number;
  statusBreakdown?: Record<string, number>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ComponentHealthIndicator: React.FC<ComponentHealthIndicatorProps> = ({
  status,
  componentCount,
  statusBreakdown = {},
  size = 'md',
  className
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'error':
        return {
          icon: XCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          description: 'Есть компоненты с ошибками'
        };
      case 'warning':
        return {
          icon: AlertCircle,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          description: 'Есть отключенные компоненты'
        };
      case 'healthy':
      default:
        return {
          icon: CircleCheck,
          color: 'text-green-500',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          description: 'Все компоненты работают нормально'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (componentCount === 0) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn(
          "rounded-full p-1 flex items-center justify-center",
          "bg-slate-700 border border-slate-600"
        )}>
          <div className="h-3 w-3 rounded-full bg-slate-500" />
        </div>
        <span className="text-xs font-medium text-slate-500">0</span>
      </div>
    );
  }

  const formatBreakdown = () => {
    const parts = [];
    if (statusBreakdown.online) parts.push(`${statusBreakdown.online} исправных`);
    if (statusBreakdown.offline) parts.push(`${statusBreakdown.offline} офлайн`);
    if (statusBreakdown.error) parts.push(`${statusBreakdown.error} с ошибками`);
    if (statusBreakdown.disabled) parts.push(`${statusBreakdown.disabled} отключенных`);
    if (statusBreakdown.archived) parts.push(`${statusBreakdown.archived} архивных`);
    
    return parts.length > 0 ? parts.join(', ') : `${componentCount} компонентов`;
  };

  return (
    <div 
      className={cn("flex items-center gap-2", className)}
      title={`${config.description} (${formatBreakdown()})`}
    >
      <div className={cn(
        "rounded-full p-1 flex items-center justify-center",
        "bg-slate-700 border border-slate-600"
      )}>
        <Icon className={cn(sizeClasses[size], config.color)} />
      </div>
      <span className="text-xs font-medium text-slate-300">
        {componentCount}
      </span>
    </div>
  );
};

export default ComponentHealthIndicator;