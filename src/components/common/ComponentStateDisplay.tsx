import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  AlertTriangle, 
  ShieldX, 
  Power, 
  RefreshCw, 
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';
import { ComponentState } from '@/hooks/useComponentState';

interface ComponentStateDisplayProps {
  state: ComponentState;
  message?: string;
  onRetry?: () => void;
  showRetryButton?: boolean;
  className?: string;
}

const StateIcons = {
  loading: Loader2,
  error: AlertTriangle,
  unauthorized: ShieldX,
  disabled: Power,
  ready: Eye
};

const StateColors = {
  loading: 'text-blue-400',
  error: 'text-red-400',
  unauthorized: 'text-orange-400',
  disabled: 'text-slate-400',
  ready: 'text-green-400'
};

const StateTitles = {
  loading: 'Загрузка...',
  error: 'Ошибка',
  unauthorized: 'Доступ запрещен',
  disabled: 'Компонент отключен',
  ready: 'Готово'
};

const StateDescriptions = {
  loading: 'Пожалуйста, подождите, данные загружаются',
  error: 'Произошла ошибка при загрузке данных',
  unauthorized: 'У вас нет прав для доступа к этому разделу',
  disabled: 'Данная функция временно недоступна',
  ready: 'Компонент готов к работе'
};

export function ComponentStateDisplay({ 
  state, 
  message, 
  onRetry, 
  showRetryButton = true, 
  className = "" 
}: ComponentStateDisplayProps) {
  
  if (state === 'ready') {
    return null; // Не показываем ничего, если состояние готово
  }

  const Icon = StateIcons[state];
  const iconColor = StateColors[state];
  const title = StateTitles[state];
  const description = message || StateDescriptions[state];

  return (
    <Card className={`bg-slate-800 border-slate-700 ${className}`}>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4">
            <Icon 
              className={`h-16 w-16 ${iconColor} ${state === 'loading' ? 'animate-spin' : ''}`} 
            />
          </div>
          
          <h3 className="text-xl font-semibold text-white mb-2">
            {title}
          </h3>
          
          <p className="text-slate-400 mb-4 max-w-md">
            {description}
          </p>

          {/* Дополнительные действия */}
          <div className="flex gap-3">
            {state === 'error' && onRetry && showRetryButton && (
              <Button
                variant="outline"
                onClick={onRetry}
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Повторить
              </Button>
            )}

            {state === 'unauthorized' && (
              <Button
                variant="outline"
                onClick={() => window.location.href = '/profile'}
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                <Lock className="w-4 h-4 mr-2" />
                Профиль
              </Button>
            )}
          </div>

          {/* Подсказки для пользователя */}
          {state === 'unauthorized' && (
            <div className="mt-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
              <div className="flex items-start gap-3">
                <EyeOff className="h-5 w-5 text-orange-400 mt-0.5" />
                <div className="text-left">
                  <div className="text-sm font-medium text-white mb-1">
                    Что это значит?
                  </div>
                  <div className="text-xs text-slate-400">
                    Для доступа к этому разделу необходимы дополнительные права. 
                    Обратитесь к администратору системы для получения доступа.
                  </div>
                </div>
              </div>
            </div>
          )}

          {state === 'disabled' && (
            <div className="mt-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
              <div className="flex items-start gap-3">
                <Power className="h-5 w-5 text-slate-400 mt-0.5" />
                <div className="text-left">
                  <div className="text-sm font-medium text-white mb-1">
                    Временно недоступно
                  </div>
                  <div className="text-xs text-slate-400">
                    Данная функция отключена для обслуживания. 
                    Попробуйте позже или обратитесь к техническому специалисту.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ComponentStateDisplay;