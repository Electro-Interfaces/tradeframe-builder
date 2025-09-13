import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, X } from 'lucide-react';

interface UpdateNotificationProps {
  onUpdate?: () => void;
  onDismiss?: () => void;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({ onUpdate, onDismiss }) => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'checking' | 'updating' | 'no-updates' | null>(null);

  useEffect(() => {
    const handleServiceWorkerUpdate = () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          // SW обновился, перезагружаем страницу
          window.location.reload();
        });

        navigator.serviceWorker.ready.then(registration => {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Новая версия готова
                setWaitingWorker(newWorker);
                setShowUpdate(true);
              }
            });
          });
        });
      }
    };

    handleServiceWorkerUpdate();
  }, []);

  const handleUpdateClick = () => {
    if (waitingWorker) {
      setIsUpdating(true);
      setUpdateStatus('updating');

      // Сообщаем новому SW, что он может стать активным
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });

      // Показываем статус обновления
      setTimeout(() => {
        setShowUpdate(false);
        setIsUpdating(false);
        onUpdate?.();
      }, 1500);
    } else {
      // Если нет ожидающего воркера, проверяем обновления
      setIsUpdating(true);
      setUpdateStatus('checking');

      setTimeout(() => {
        setUpdateStatus('no-updates');
        setIsUpdating(false);

        // Скрываем сообщение через 3 секунды
        setTimeout(() => {
          setUpdateStatus(null);
        }, 3000);
      }, 1000);
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
    onDismiss?.();
  };

  if (!showUpdate && !updateStatus) {
    return null;
  }

  return (
    <Card className="fixed top-4 left-4 right-4 z-50 shadow-lg border-trade.blue/30 bg-slate-800/95 backdrop-blur-md md:max-w-md md:left-auto md:right-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <RefreshCw className="h-6 w-6 text-trade.blue" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white mb-1">
              {updateStatus === 'checking' ? 'Проверка обновлений...' :
               updateStatus === 'updating' ? 'Обновление...' :
               updateStatus === 'no-updates' ? 'Нет доступных обновлений' :
               'Доступно обновление'}
            </h3>
            <p className="text-xs text-slate-300 mb-3">
              {updateStatus === 'checking' ? 'Поиск новых версий приложения' :
               updateStatus === 'updating' ? 'Применение обновления, пожалуйста подождите' :
               updateStatus === 'no-updates' ? 'У вас установлена последняя версия' :
               'Новая версия TradeFrame готова к установке. Обновите для получения последних улучшений.'}
            </p>

            <div className="flex gap-2">
              <Button
                onClick={handleUpdateClick}
                size="sm"
                disabled={isUpdating || updateStatus === 'no-updates'}
                className="bg-trade.blue hover:bg-trade.blue/90 text-white disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isUpdating ? 'animate-spin' : ''}`} />
                {updateStatus === 'checking' ? 'Проверка...' :
                 updateStatus === 'updating' ? 'Обновление...' :
                 updateStatus === 'no-updates' ? 'Актуально' :
                 'Обновить'}
              </Button>

              <Button
                onClick={handleDismiss}
                size="sm"
                variant="ghost"
                className="text-slate-300 hover:text-white hover:bg-slate-700"
              >
                Позже
              </Button>
            </div>
          </div>

          <Button
            onClick={handleDismiss}
            size="sm"
            variant="ghost"
            className="flex-shrink-0 h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UpdateNotification;