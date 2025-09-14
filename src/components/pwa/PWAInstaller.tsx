import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X, Smartphone, MoreVertical, Share } from 'lucide-react';
import { useEngagementTracker } from '@/hooks/useEngagementTracker';

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

    // Browser and device detection completed

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
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);

      // Показываем промпт только если есть deferredPrompt
      setTimeout(() => {
        if (!isInstalled && deferredPrompt) {
          setShowPrompt(true);
        }
      }, 1000);
    };

    // ДИАГНОСТИКА: Проверяем PWA критерии для Chrome
    if (isChrome) {
      setTimeout(() => {
        const diagnose = {
          hasManifest: !!document.querySelector('link[rel="manifest"]'),
          hasServiceWorker: 'serviceWorker' in navigator,
          isHTTPS: location.protocol === 'https:',
          hasValidIcons: true, // предполагаем что есть
          isStandalone: window.matchMedia('(display-mode: standalone)').matches,
          userEngagement: document.visibilityState === 'visible'
        };

        console.log('🔍 Chrome PWA Диагностика - почему beforeinstallprompt НЕ срабатывает:', diagnose);

        // Дополнительные проверки
        const additionalChecks = {
          alreadyInstalled: window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone,
          hasMinimalUI: window.matchMedia('(display-mode: minimal-ui)').matches,
          browserUI: window.matchMedia('(display-mode: browser)').matches,
          relatedApplications: navigator.getInstalledRelatedApps ? 'supported' : 'not supported'
        };

        console.log('🔍 Chrome PWA Дополнительные проверки:', additionalChecks);

        // Проверим manifest содержимое
        fetch('/tradeframe-builder/manifest.json')
          .then(r => r.json())
          .then(manifest => {
            console.log('📋 Manifest анализ для Chrome PWA:', {
              name: manifest.name,
              shortName: manifest.short_name,
              display: manifest.display,
              startUrl: manifest.start_url,
              themeColor: manifest.theme_color,
              backgroundColor: manifest.background_color,
              icons: manifest.icons?.length || 0
            });
          })
          .catch(e => console.error('❌ Ошибка анализа manifest:', e));

      }, 500);
    }

    // Отключаем агрессивный fallback - только естественные PWA события
    console.log('⏰ PWA Installer: Ждем естественное beforeinstallprompt событие от браузера');
    const fallbackTimer = setTimeout(() => {
      console.log('🔍 PWA Installer: Проверяем состояние без агрессивного показа:', {
        canInstall,
        isInstalled,
        detectedMobile,
        detectedIOS,
        isChrome,
        isFirefox,
        hasDeferredPrompt: !!deferredPrompt
      });

      if (isChrome && !deferredPrompt) {
        console.log('💡 Chrome PWA: beforeinstallprompt не сработал, возможные причины:');
        console.log('- PWA уже установлено (проверьте chrome://apps)');
        console.log('- Недостаточно user engagement (нужно больше взаимодействий)');
        console.log('- Проблемы с manifest или Service Worker');
        console.log('- Chrome требует больше времени для анализа PWA критериев');
        console.log('- Используйте DevTools > Application > Manifest для диагностики');

        // Добавим кнопку для разработчиков
        if (process.env.NODE_ENV === 'development') {
          console.log('🛠️ DEV: Для тестирования выполните в консоли: window.boostEngagement()');
          (window as any).boostEngagement = boostEngagement;
        }
      }

      // НЕ показываем принудительный PWA installer
      console.log('✅ PWA Installer: Режим "только естественные события" - промпт появится только при beforeinstallprompt');
    }, 5000);

    // iOS особенность: ВСЕ браузеры на iOS используют WebKit Safari движок
    // Только Safari может устанавливать PWA, остальные браузеры показывают предложение открыть в Safari
    if (detectedIOS && !isInstalled) {
      console.log('📱 PWA Installer: iOS обнаружена - ждем естественные события Safari');
      console.log('🍎 iOS PWA может быть установлено только через Safari "Поделиться" → "На экран Домой"');
      console.log('🔧 iOS PWA не показывает beforeinstallprompt - установка только вручную пользователем');

      // НЕ показываем принудительный iOS промпт
      // Пользователь сам может добавить через Safari Share menu
    }

    // Слушаем событие appinstalled
    const handleAppInstalled = () => {
      console.log('🎉 PWA Installer: Приложение успешно установлено!', {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      setIsInstalled(true);
      setShowPrompt(false);
      setCanInstall(false);
      onInstalled?.();
    };

    console.log('👂 PWA Installer: Добавляем event listeners...');
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    console.log('✅ PWA Installer: Event listeners добавлены, ожидаем события...');

    return () => {
      console.log('🧹 PWA Installer: Очистка event listeners (обычная версия)');
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(fallbackTimer);
    };
  }, [isInstalled, onInstalled]);

  const handleInstallClick = async () => {

    // КРИТИЧЕСКИЙ ФИК ДЛЯ iOS PWA: Создаем резервную копию auth данных
    if (isIOS) {
      const currentUser = localStorage.getItem('tradeframe_user');
      const authToken = localStorage.getItem('authToken');

      if (currentUser && authToken) {
        const authBackup = {
          user: currentUser,
          token: authToken,
          timestamp: new Date().toISOString()
        };
        sessionStorage.setItem('pwa-auth-backup', JSON.stringify(authBackup));
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
        '📱 Для установки TradeFrame на домашний экран в Opera:\n\n' +
        '1. Нажмите кнопку меню (⋮) в правом нижнем углу браузера\n' +
        '2. Выберите "Добавить на главный экран" или "Установить"\n' +
        '3. Подтвердите установку\n\n' +
        'После установки приложение будет доступно с домашнего экрана!'
      );
    } else if (isIOS && isSafari) {
      alert(
        '📱 Установка TradeFrame PWA на iPhone/iPad:\n\n' +
        '1. Убедитесь, что используете Safari (не Chrome или другой браузер)\n' +
        '2. Нажмите кнопку "Поделиться" (□↗) в нижней панели Safari\n' +
        '3. Прокрутите список действий и найдите "На экран \"Домой\""\n' +
        '4. Нажмите "На экран \"Домой\""\n' +
        '5. Отредактируйте название приложения при необходимости\n' +
        '6. Нажмите "Добавить" в правом верхнем углу\n\n' +
        '✨ После установки TradeFrame будет работать как полноценное приложение с:\n' +
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
          '• Или меню Chrome (⋮) → "Установить TradeFrame..."\n' +
          '• Или меню Chrome (⋮) → "Сохранить и поделиться" → "Установить приложение"\n\n' +
          'Если опции нет, проверьте:\n' +
          '- Откройте chrome://apps и убедитесь что PWA не установлено\n' +
          '- Перезагрузите страницу и подождите немного\n' +
          '- Активно взаимодействуйте со страницей'
        );
      } else if (isFirefox) {
        alert(
          '🦊 Firefox PWA установка:\n\n' +
          '• Меню Firefox (☰) → "Установить сайт как приложение"\n' +
          '• Или создайте закладку и добавьте на главный экран\n\n' +
          'Firefox поддерживает PWA ограниченно, но приложение будет работать!'
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
        process.env.NODE_ENV === 'development' && console.log('PWA dismissal cleared - reload page to test again');
      };
    }
  };

  // Если уже установлено или промпт не нужно показывать
  if (isInstalled || !showPrompt || !canInstall) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 shadow-2xl border-2 border-green-500/50 bg-gradient-to-r from-slate-900/95 to-slate-800/95 backdrop-blur-md md:max-w-md md:left-auto md:right-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="bg-green-500/20 p-2 rounded-full">
              <Smartphone className="h-6 w-6 text-green-400" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-green-400 mb-1 flex items-center gap-1">
              📱 Установить TradeFrame
            </h3>
            <p className="text-xs text-green-200 mb-3 font-medium">
              {(isOpera && isMobile && !isIOS) && !deferredPrompt ? (
                <>Используйте меню браузера (⋮) → "Добавить на главный экран" для установки приложения</>
              ) : (isIOS && isSafari) && !deferredPrompt ? (
                <>Нажмите "Поделиться" (□↗) → "На экран Домой" для установки полноценного PWA</>
              ) : (isIOS && !isSafari) && !deferredPrompt ? (
                <>На iOS только Safari может устанавливать PWA. Откройте эту страницу в Safari</>
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
                className="text-green-300 hover:text-green-200 hover:bg-green-900/30"
              >
                Позже
              </Button>
            </div>
          </div>

          <Button
            onClick={handleDismiss}
            size="sm"
            variant="ghost"
            className="flex-shrink-0 h-6 w-6 p-0 text-green-400 hover:text-green-200 hover:bg-green-900/30"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PWAInstaller;