import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X, Smartphone, MoreVertical, Share } from 'lucide-react';
import { useEngagementTracker } from '@/hooks/useEngagementTracker';
import { AUTH_KEYS, getToken, getUser } from '@/utils/authStorage';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface PWAInstallerProps {
  onInstalled?: () => void;
  onDismissed?: () => void;
}

export const PWAInstaller: React.FC<PWAInstallerProps> = ({ onInstalled, onDismissed }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isOpera, setIsOpera] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isYandex, setIsYandex] = useState(false);
  const [isFirefox, setIsFirefox] = useState(false);
  const [isChrome, setIsChrome] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isEdge, setIsEdge] = useState(false);

  // Отслеживание активности пользователя
  const { metrics, isEngagementSufficient, isUserActive, boostEngagement } = useEngagementTracker();

  // Отслеживаем engagement, но НЕ показываем принудительно
  useEffect(() => {
    // Проверяем, не отклонил ли уже пользователь установку
    const dismissedTime = localStorage.getItem('pwa-install-dismissed');
    if (dismissedTime) {
      const timeSinceDismiss = Date.now() - parseInt(dismissedTime);
      const oneDayMs = 24 * 60 * 60 * 1000; // 24 часа

      if (timeSinceDismiss < oneDayMs) {
        return;
      } else {
        // Прошло больше дня, можно показать снова
        localStorage.removeItem('pwa-install-dismissed');
      }
    }

    if (isChrome && isEngagementSufficient) {

      // НЕ показываем принудительно - только при beforeinstallprompt
      // setCanInstall(true);
      // setShowPrompt(true);
    }
  }, [isEngagementSufficient, isChrome, canInstall, isInstalled, showPrompt, metrics]);

  useEffect(() => {
    // Проверяем, не отклонил ли уже пользователь установку
    const dismissedTime = localStorage.getItem('pwa-install-dismissed');
    if (dismissedTime) {
      const timeSinceDismiss = Date.now() - parseInt(dismissedTime);
      const oneDayMs = 24 * 60 * 60 * 1000; // 24 часа

      if (timeSinceDismiss < oneDayMs) {
        return;
      } else {
        // Прошло больше дня, можно показать снова
        localStorage.removeItem('pwa-install-dismissed');
      }
    }

    // Определяем браузер и устройство
    const userAgent = navigator.userAgent;
    const detectedOpera = /Opera|OPR\//i.test(userAgent);
    const detectedMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isYandex = /YaBrowser|YandexBrowser/i.test(userAgent);
    const isFirefox = /Firefox/i.test(userAgent);
    const isChrome = /Chrome/i.test(userAgent) && !/Edg/i.test(userAgent) && !/YaBrowser/i.test(userAgent);
    const detectedSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent) && !/Chromium/i.test(userAgent);
    const detectedIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isEdge = /Edg/i.test(userAgent);
    const isChromium = /Chromium/i.test(userAgent);

    setIsOpera(detectedOpera);
    setIsMobile(detectedMobile);
    setIsYandex(isYandex);
    setIsFirefox(isFirefox);
    setIsChrome(isChrome);
    setIsSafari(detectedSafari);
    setIsIOS(detectedIOS);
    setIsEdge(isEdge);

    // Проверяем, установлено ли уже приложение
    const checkInstalled = () => {
      const standaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      const navigatorStandalone = (window.navigator as any).standalone;
      const fullscreenMode = window.matchMedia('(display-mode: fullscreen)').matches;
      const minimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
      const browserMode = window.matchMedia('(display-mode: browser)').matches;

      // Проверяем standalone режим
      if (standaloneMode) {
        setIsInstalled(true);
        return;
      }

      // Проверяем Navigator standalone (iOS Safari)
      if (navigatorStandalone) {
        setIsInstalled(true);
        return;
      }
    };

    checkInstalled();

    // Слушаем событие beforeinstallprompt
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Предотвращаем показ нативного браузерного промпта
      e.preventDefault();
      // Сохраняем deferred prompt для вызова из кастомного UI
      setDeferredPrompt(e);
      setCanInstall(true);

      // Показываем кастомный UI промпт с задержкой
      // Используем e напрямую, т.к. deferredPrompt из замыкания ещё null
      setTimeout(() => {
        setShowPrompt(true);
      }, 1000);
    };

    const fallbackTimer = setTimeout(() => {
      if (isChrome && !deferredPrompt) {
        if (process.env.NODE_ENV === 'development') {
          (window as any).boostEngagement = boostEngagement;
        }
      }
    }, 5000);

    // Слушаем событие appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setCanInstall(false);
      onInstalled?.();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(fallbackTimer);
    };
  }, [isInstalled, onInstalled]);

  const handleInstallClick = async () => {
    // КРИТИЧЕСКИЙ ФИК ДЛЯ iOS PWA: Создаем резервную копию auth данных
    // sessionStorage НЕ переносится в standalone PWA контекст на iOS,
    // поэтому сохраняем бэкап в localStorage, который доступен из обоих контекстов
    if (isIOS) {
      const currentUser = getUser();
      const authToken = getToken();

      if (currentUser && authToken) {
        const authBackup = {
          user: currentUser,
          token: authToken,
          timestamp: new Date().toISOString()
        };
        // Сохраняем в localStorage — он доступен и из Safari, и из standalone PWA
        localStorage.setItem('pwa-auth-backup', JSON.stringify(authBackup));
      }

      // Дополнительно копируем все auth-ключи из sessionStorage в localStorage
      const sessionAuthKeys = [AUTH_KEYS.TOKEN, AUTH_KEYS.USER, 'sb-access-token', 'sb-refresh-token'];
      for (const key of sessionAuthKeys) {
        const val = sessionStorage.getItem(key);
        if (val) {
          localStorage.setItem(`pwa-backup-${key}`, val);
        }
      }
    }

    // Если есть стандартный промпт - используем его
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;

        if (choiceResult.outcome === 'accepted') {
          setShowPrompt(false);
          setIsInstalled(true);
          onInstalled?.();
        } else {
          onDismissed?.();
        }

        setDeferredPrompt(null);
        setCanInstall(false);
      } catch (error) {
        console.error('PWA installation error:', error);
      }
      return;
    }

    // Инструкции для разных браузеров
    if (isOpera && isMobile) {
      alert(
        '📱 Для установки TradeControl на домашний экран в Opera:\n\n' +
        '1. Нажмите кнопку меню (⋮) в правом нижнем углу браузера\n' +
        '2. Выберите "Добавить на главный экран" или "Установить"\n' +
        '3. Подтвердите установку\n\n' +
        'После установки приложение будет доступно с домашнего экрана!'
      );
    } else if (isIOS && isSafari) {
      alert(
        '📱 Установка TradeControl PWA на iPhone/iPad:\n\n' +
        '1. Убедитесь, что используете Safari (не Chrome или другой браузер)\n' +
        '2. Нажмите кнопку "Поделиться" (□↗) в нижней панели Safari\n' +
        '3. Прокрутите список действий и найдите "На экран "Домой""\n' +
        '4. Нажмите "На экран "Домой""\n' +
        '5. Отредактируйте название приложения при необходимости\n' +
        '6. Нажмите "Добавить" в правом верхнем углу\n\n' +
        '✨ После установки TradeControl будет работать как полноценное приложение с:\n' +
        '• Собственной иконкой на главном экране\n' +
        '• Запуском в полноэкранном режиме\n' +
        '• Работой без интернета (в режиме офлайн)'
      );
    } else if (isIOS && !isSafari) {
      alert(
        '📱 Для установки полноценного PWA приложения на iOS:\n\n' +
        '⚠️ На iOS только Safari может устанавливать PWA приложения\n\n' +
        '1. Откройте эту страницу в Safari:\n' +
        '   • Скопируйте ссылку: ' + window.location.href + '\n' +
        '   • Откройте Safari и вставьте ссылку\n\n' +
        '2. В Safari нажмите "Поделиться" (□↗) → "На экран Домой"\n\n' +
        'После установки через Safari приложение будет работать как нативное!'
      );
    } else {
      if (isChrome) {
        alert(
          '🌐 Chrome PWA установка:\n\n' +
          '• Кликните на иконку "Установить" в адресной строке (если есть)\n' +
          '• Или меню Chrome (⋮) → "Установить TradeControl..."\n' +
          '• Или меню Chrome (⋮) → "Сохранить и поделиться" → "Установить приложение"\n\n' +
          'Если опции нет, проверьте:\n' +
          '- Откройте chrome://apps и убедитесь что PWA не установлено\n' +
          '- Перезагрузите страницу и подождите немного\n' +
          '- Активно взаимодействуйте со страницей'
        );
      } else if (isYandex) {
        alert(
          '🟡 Яндекс.Браузер PWA установка:\n\n' +
          '• Кликните на иконку "Установить" в адресной строке (если есть)\n' +
          '• Или нажмите кнопку меню (≡) в верхней части браузера\n' +
          '• Выберите "Установить приложение" или "Установить сайт как приложение"\n\n' +
          '✨ После установки TradeControl будет работать как:\n' +
          '• Отдельное приложение с собственным окном\n' +
          '• Иконка на домашнем экране Android\n' +
          '• Работа без интернета (офлайн режим)\n\n' +
          'Яндекс.Браузер отлично поддерживает PWA начиная с версии 18.7!'
        );
      } else if (isFirefox) {
        alert(
          '🦊 Firefox — ограниченная поддержка PWA:\n\n' +
          '⚠️ Для полноценной установки PWA рекомендуем Google Chrome.\n\n' +
          'В Firefox:\n' +
          '• Меню (☰) → «Добавить на домашний экран» (Android)\n' +
          '• Или создайте закладку для быстрого доступа\n\n' +
          'В Chrome:\n' +
          '• Меню (⋮) → «Установить приложение» — полная PWA поддержка\n' +
          '• Работа офлайн, push-уведомления, автообновления'
        );
      } else if (isEdge) {
        alert(
          '🔷 Edge PWA установка:\n\n' +
          '• Кликните на иконку "Установить приложение" в адресной строке\n' +
          '• Или меню Edge (...) → "Приложения" → "Установить этот сайт как приложение"\n\n' +
          'Edge отлично поддерживает PWA!'
        );
      } else {
        alert(
          '📱 Ваш браузер не поддерживает автоматическую установку приложений.\n\n' +
          'Попробуйте найти опцию "Установить приложение" или "Добавить на главный экран" в меню браузера.\n\n' +
          'Для лучшего PWA опыта рекомендуем Chrome, Edge или Safari.'
        );
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    onDismissed?.();

    // Не показываем промпт повторно в течение сессии
    setCanInstall(false);

    // Сохраняем в localStorage что пользователь отклонил установку
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());

    // Для разработки: добавляем функцию сброса
    if (process.env.NODE_ENV === 'development') {
      (window as any).clearPWADismissal = () => {
        localStorage.removeItem('pwa-install-dismissed');
      };
    }
  };

  // Если уже установлено или промпт не нужно показывать
  if (isInstalled || !showPrompt || !canInstall) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 shadow-2xl border-2 border-green-500/50 bg-gradient-to-r from-background/95 to-card/95 backdrop-blur-md md:max-w-md md:left-auto md:right-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="bg-emerald-100 dark:bg-emerald-500/20 p-2 rounded-full">
              <Smartphone className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-green-600 dark:text-green-400 mb-1 flex items-center gap-1">
              📱 Установить TradeControl
            </h3>
            <p className="text-xs text-green-700 dark:text-green-200 mb-3 font-medium">
              {(isOpera && isMobile && !isIOS) && !deferredPrompt ? (
                <>Используйте меню браузера (⋮) → "Добавить на главный экран" для установки приложения</>
              ) : (isIOS && isSafari) && !deferredPrompt ? (
                <>Нажмите "Поделиться" (□↗) → "На экран Домой" для установки полноценного PWA</>
              ) : (isIOS && !isSafari) && !deferredPrompt ? (
                <>На iOS только Safari может устанавливать PWA. Откройте эту страницу в Safari</>
              ) : isYandex && !deferredPrompt ? (
                <>Используйте меню браузера (≡) → &laquo;Установить приложение&raquo; для установки PWA в Яндекс.Браузере</>
              ) : isFirefox && !deferredPrompt ? (
                <>Для полной поддержки PWA рекомендуем Chrome. В Firefox: меню (☰) → &laquo;Добавить на домашний экран&raquo;</>
              ) : (
                <>Установите приложение на домашний экран для быстрого доступа и лучшего опыта использования</>
              )}
            </p>

            <div className="flex gap-2">
              <Button
                onClick={handleInstallClick}
                size="sm"
                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold shadow-lg"
              >
                {deferredPrompt ? (
                  <>
                    <Download className="h-4 w-4 mr-1" />
                    Установить
                  </>
                ) : (isOpera && isMobile && !isIOS) ? (
                  <>
                    <MoreVertical className="h-4 w-4 mr-1" />
                    Инструкции Opera
                  </>
                ) : (isIOS && isSafari) ? (
                  <>
                    <Share className="h-4 w-4 mr-1" />
                    Инструкции Safari
                  </>
                ) : (isIOS && !isSafari) ? (
                  <>
                    <Share className="h-4 w-4 mr-1" />
                    Открыть в Safari
                  </>
                ) : isYandex ? (
                  <>
                    <Download className="h-4 w-4 mr-1" />
                    Инструкции Яндекс
                  </>
                ) : (
                  <>
                    <Share className="h-4 w-4 mr-1" />
                    Как установить
                  </>
                )}
              </Button>

              <Button
                onClick={handleDismiss}
                size="sm"
                variant="ghost"
                className="text-green-600 dark:text-green-300 hover:text-green-200 hover:bg-emerald-900/30"
              >
                Позже
              </Button>
            </div>
          </div>

          <Button
            onClick={handleDismiss}
            size="sm"
            variant="ghost"
            className="flex-shrink-0 h-6 w-6 p-0 text-green-600 dark:text-green-400 hover:text-green-200 hover:bg-emerald-900/30"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PWAInstaller;
