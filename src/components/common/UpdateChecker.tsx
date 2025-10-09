import { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { APP_VERSION } from '@/config/version';

interface UpdateCheckerProps {
  className?: string;
  onShowUpdateInfo?: (details: {
    version: string;
    buildNumber: string;
    hasUpdate: boolean;
    swRegistrations: number;
    swActive: boolean;
    swWaiting: boolean;
    swScope: string;
    lastCheck: string;
  }) => void;
}

export const UpdateChecker: React.FC<UpdateCheckerProps> = ({ className, onShowUpdateInfo }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'no-updates' | 'found-updates' | null>(null);

  const currentVersion = APP_VERSION;
  // Генерируем номер сборки на основе даты (YYYYMMDD + часы)
  const now = new Date();
  const buildNumber = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}.${now.getHours().toString().padStart(2, '0')}`;

  const checkForUpdates = async () => {
    if (isChecking) return;

    setIsChecking(true);
    setLastChecked(new Date());
    setUpdateStatus(null); // Сбрасываем предыдущий статус

    try {
      // Проверяем Service Worker на наличие обновлений
      if ('serviceWorker' in navigator) {

        // Проверяем, есть ли зарегистрированные Service Workers
        const registrations = await navigator.serviceWorker.getRegistrations();

        if (registrations.length === 0) {
          console.log('❌ UpdateChecker: Service Worker не зарегистрирован, попробуем зарегистрировать...');

          try {
            const swPath = import.meta.env.PROD ? '/tradeframe-builder/sw.js' : '/sw.js';
            const registration = await navigator.serviceWorker.register(swPath);

            // После регистрации ждем немного и проверяем обновления
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (regError) {
            console.error('❌ UpdateChecker: Ошибка регистрации Service Worker:', regError);
            setUpdateStatus('no-updates');
            setTimeout(() => setUpdateStatus(null), 3000);
            return;
          }
        }

        // Добавляем тайм-аут для ready
        const readyPromise = navigator.serviceWorker.ready;
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Service Worker ready timeout')), 5000)
        );

        const registration = await Promise.race([readyPromise, timeoutPromise]) as ServiceWorkerRegistration;

        // Дополнительные проверки состояния
        console.log('🔄 UpdateChecker: Registration state:', {
          active: !!registration.active,
          installing: !!registration.installing,
          waiting: !!registration.waiting,
          scope: registration.scope
        });

        // Принудительно проверяем обновления
        await registration.update();

        // Ждем немного для обработки
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Проверяем есть ли ожидающий SW
        if (registration.waiting) {
          setHasUpdate(true);
          setUpdateStatus('found-updates');

          // Вызываем callback для показа информационного окна
          onShowUpdateInfo?.({
            version: currentVersion,
            buildNumber,
            hasUpdate: true,
            swRegistrations: registrations.length,
            swActive: !!registration.active,
            swWaiting: !!registration.waiting,
            swScope: registration.scope,
            lastCheck: new Date().toLocaleString('ru-RU')
          });

          // Активируем новый Service Worker
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });

          // Показываем уведомление и перезагружаем через 3 сек
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        } else {
          setHasUpdate(false);
          setUpdateStatus('no-updates');

          // Вызываем callback для показа информационного окна
          onShowUpdateInfo?.({
            version: currentVersion,
            buildNumber,
            hasUpdate: false,
            swRegistrations: registrations.length,
            swActive: !!registration.active,
            swWaiting: !!registration.waiting,
            swScope: registration.scope,
            lastCheck: new Date().toLocaleString('ru-RU')
          });
        }
      } else {
        console.log('❌ UpdateChecker: Service Worker не поддерживается');
        setUpdateStatus('no-updates');
        setTimeout(() => {
          setUpdateStatus(null);
        }, 3000);
      }
    } catch (error) {
      console.error('❌ UpdateChecker: Ошибка при проверке обновлений:', error);
      setUpdateStatus('no-updates');
      setTimeout(() => {
        setUpdateStatus(null);
      }, 3000);
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = () => {
    if (isChecking) {
      return <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />;
    }
    if (hasUpdate) {
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    }
    if (updateStatus === 'no-updates') {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (updateStatus === 'found-updates') {
      return <AlertCircle className="h-4 w-4 text-orange-500 animate-pulse" />;
    }
    if (lastChecked) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <RefreshCw className="h-4 w-4 text-slate-400" />;
  };

  const getStatusText = () => {
    if (isChecking) return 'Проверка...';
    if (hasUpdate) return 'Обновление...';
    if (updateStatus === 'no-updates') return 'Актуальная версия';
    if (updateStatus === 'found-updates') return 'Найдены обновления!';
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
          {isChecking ? 'Проверка обновлений...' : 'Проверить обновления'}
        </span>
        <span className="text-xs text-muted-foreground">
          v{currentVersion} (#{buildNumber})
        </span>
        {lastChecked && (
          <span className="text-xs text-muted-foreground">
            Последняя проверка: {lastChecked.toLocaleTimeString('ru-RU')}
          </span>
        )}
      </div>
    </div>
  );
};

export default UpdateChecker;