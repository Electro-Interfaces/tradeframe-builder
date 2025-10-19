/**
 * Компоненты отображения состояний загрузки
 * Переиспользуемые компоненты для страниц
 */

import { RefreshCw, Settings, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Инициализация данных...' }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-slate-400">{message}</p>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title, message, icon }: EmptyStateProps) {
  return (
    <div className="w-full space-y-6 px-4 md:px-6 lg:px-8 pt-6">
      <div className="mb-6 pt-4">
        {icon && <div className="mb-4">{icon}</div>}
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        <p className="text-slate-400 mt-2">{message}</p>
      </div>
    </div>
  );
}

interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
  loading?: boolean;
}

export function ErrorState({ title, message, onRetry, loading }: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center max-w-md">
        <Settings className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
        <p className="text-slate-400 mb-4">{message}</p>
        {onRetry && (
          <Button onClick={onRetry} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Повторить попытку
          </Button>
        )}
      </div>
    </div>
  );
}
