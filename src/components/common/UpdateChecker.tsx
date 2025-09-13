import { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface UpdateCheckerProps {
  className?: string;
}

export const UpdateChecker: React.FC<UpdateCheckerProps> = ({ className }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);

  const currentVersion = '1.5.3';
  const buildNumber = '1.5.3';

  const checkForUpdates = async () => {
    if (isChecking) return;

    setIsChecking(true);
    setLastChecked(new Date());

    try {
      // Проверяем Service Worker на наличие обновлений
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;

        // Принудительно проверяем обновления
        await registration.update();

        // Ждем немного для обработки
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Проверяем есть ли ожидающий SW
        if (registration.waiting) {
          setHasUpdate(true);
          // Активируем новый Service Worker
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });

          // Показываем уведомление и перезагружаем через 2 сек
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          setHasUpdate(false);
        }
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = () => {
    if (isChecking) {
      return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    }
    if (hasUpdate) {
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    }
    if (lastChecked) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <RefreshCw className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (isChecking) return 'Проверка...';
    if (hasUpdate) return 'Обновление...';
    if (lastChecked) {
      const timeDiff = Date.now() - lastChecked.getTime();
      const minutes = Math.floor(timeDiff / (1000 * 60));
      return minutes < 1 ? 'Обновлено' : `${minutes}м назад`;
    }
    return 'Обновить';
  };

  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-accent/50 transition-colors ${className}`}
      onClick={checkForUpdates}
    >
      {getStatusIcon()}
      <div className="flex flex-col">
        <span className="text-sm font-medium">
          {isChecking ? 'Проверка обновлений...' : hasUpdate ? 'Устанавливается...' : 'Обновить'}
        </span>
        <span className="text-xs text-muted-foreground">
          Версия {buildNumber}
        </span>
        {lastChecked && (
          <span className="text-xs text-muted-foreground">
            {getStatusText()}
          </span>
        )}
      </div>
    </div>
  );
};

export default UpdateChecker;