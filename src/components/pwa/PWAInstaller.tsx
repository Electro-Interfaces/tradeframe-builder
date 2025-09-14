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

  // Отслеживаем достижение engagement для Chrome
  useEffect(() => {
    if (isChrome && isEngagementSufficient && !canInstall && !isInstalled && !showPrompt) {
      console.log('🎯 PWA Installer: Engagement достигнут для Chrome! Показываем промпт немедленно', {
        metrics,
        isEngagementSufficient,
        canInstall,
        isInstalled,
        showPrompt
      });

      setCanInstall(true);
      setShowPrompt(true);
    }
  }, [isEngagementSufficient, isChrome, canInstall, isInstalled, showPrompt, metrics]);

  useEffect(() => {
    console.log('🚀 PWA Installer: Starting initialization...');

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

    console.log('🔍 PWA Installer: Полная диагностика браузера:', {
      fullUserAgent: userAgent,
      detectedBrowser: {
        isOpera: detectedOpera,
        isYandex,
        isFirefox,
        isChrome,
        isEdge,
        isChromium,
        isSafari: detectedSafari,
      },
      deviceInfo: {
        isMobile: detectedMobile,
        isIOS: detectedIOS,
        isAndroid: /Android/i.test(userAgent),
        devicePixelRatio: window.devicePixelRatio,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`
      },
      capabilities: {
        serviceWorker: 'serviceWorker' in navigator,
        pushManager: 'PushManager' in window,
        notifications: 'Notification' in window,
        fetch: 'fetch' in window,
        caches: 'caches' in window
      },
      protocol: window.location.protocol,
      isSecure: window.location.protocol === 'https:',
      domain: window.location.hostname
    });

    // Проверяем, установлено ли уже приложение
    const checkInstalled = () => {
      console.log('🔍 PWA Installer: Проверяем установку приложения...');

      const standaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      const navigatorStandalone = (window.navigator as any).standalone;
      const fullscreenMode = window.matchMedia('(display-mode: fullscreen)').matches;
      const minimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
      const browserMode = window.matchMedia('(display-mode: browser)').matches;

      console.log('🔍 PWA Installer: Режимы отображения:', {
        standaloneMode,
        navigatorStandalone,
        fullscreenMode,
        minimalUI,
        browserMode,
        referrer: document.referrer,
        isInstalled: standaloneMode || navigatorStandalone
      });

      // Проверяем standalone режим
      if (standaloneMode) {
        console.log('✅ PWA Installer: Приложение запущено в standalone режиме');
        setIsInstalled(true);
        return;
      }

      // Проверяем Navigator standalone (iOS Safari)
      if (navigatorStandalone) {
        console.log('✅ PWA Installer: Приложение запущено через iOS Home Screen');
        setIsInstalled(true);
        return;
      }

      console.log('ℹ️ PWA Installer: Приложение запущено в обычном браузере');
    };

    checkInstalled();

    // Слушаем событие beforeinstallprompt
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      console.log('🎉 PWA Installer: beforeinstallprompt событие получено!', {
        platforms: e.platforms,
        userChoice: e.userChoice,
        eventType: e.type,
        timestamp: new Date().toISOString()
      });

      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);

      console.log('🔧 PWA Installer: Событие обработано, deferredPrompt сохранен');

      // Показываем промпт для всех браузеров агрессивно
      setTimeout(() => {
        console.log('⏰ PWA Installer: Проверяем через 1 секунду - показывать ли промпт', {
          isInstalled,
          detectedMobile,
          isYandex,
          isChrome,
          isFirefox,
          shouldShow: !isInstalled
        });

        if (!isInstalled) {
          console.log('✅ PWA Installer: АГРЕССИВНО показываем промпт установки для ВСЕХ браузеров');
          setShowPrompt(true);
        } else {
          console.log('❌ PWA Installer: Промпт установки не показан - приложение уже установлено');
        }
      }, 1000); // Уменьшаем с 3 сек до 1 сек
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

    // АГРЕССИВНЫЙ fallback для всех браузеров
    console.log('⏰ PWA Installer: Запускаем АГРЕССИВНЫЙ fallback таймер на 2 секунды...');
    const fallbackTimer = setTimeout(() => {
      console.log('🔍 PWA Installer: АГРЕССИВНЫЙ Fallback таймер сработал, проверяем состояние:', {
        canInstall,
        isInstalled,
        detectedMobile,
        detectedIOS,
        isChrome,
        isFirefox,
        shouldShowFallback: !canInstall && !isInstalled
      });

      if (!canInstall && !isInstalled) {
        // Для Chrome требуем engagement, для других браузеров - показываем сразу
        if (isChrome && !isEngagementSufficient) {
          console.log('⚠️ Chrome PWA: Недостаточный engagement, ждем больше активности:', {
            timeSpent: metrics.timeSpent,
            interactions: metrics.interactions,
            scrollEvents: metrics.scrollEvents,
            required: { timeSpent: 30, interactions: 5, scrollEvents: 2 }
          });

          console.log('💡 Chrome PWA: beforeinstallprompt не сработал, возможные причины:');
          console.log('- PWA уже установлено (проверьте chrome://apps)');
          console.log('- Недостаточно user engagement (нужно больше взаимодействий)');
          console.log('- Проблемы с manifest или Service Worker');
          console.log('- Chrome требует больше времени для анализа PWA критериев');

          // Добавим кнопку для разработчиков
          if (process.env.NODE_ENV === 'development') {
            console.log('🛠️ DEV: Для тестирования выполните в консоли: window.boostEngagement()');
            (window as any).boostEngagement = boostEngagement;
          }

          return; // Не показываем промпт для Chrome без engagement
        }

        // Показываем PWA installer
        console.log('🚀 PWA Installer: Показываем fallback установку', {
          browser: isChrome ? 'Chrome (engagement ✅)' : isFirefox ? 'Firefox' : isSafari ? 'Safari' : 'Other',
          engagement: isEngagementSufficient ? '✅ Sufficient' : '❌ Insufficient',
          reason: isChrome && isEngagementSufficient ? 'Chrome + engagement' : 'Non-Chrome browser'
        });

        setCanInstall(true);
        setShowPrompt(true);
      } else {
        console.log('❌ PWA Installer: Fallback не требуется - уже установлен или canInstall = true');
      }
    }, isChrome ? 5000 : 2000); // Для Chrome ждем дольше

    // iOS особенность: ВСЕ браузеры на iOS используют WebKit Safari движок
    // Только Safari может устанавливать PWA, остальные браузеры показывают предложение открыть в Safari
    if (detectedIOS && !isInstalled) {
      console.log('📱 PWA Installer: iOS обнаружена, запускаем iOS таймер...');
      const iosTimer = setTimeout(() => {
        if (detectedSafari) {
          console.log('🍎 PWA Installer: Safari iOS - показываем инструкции установки PWA');
        } else {
          console.log('🍎 PWA Installer: Сторонний браузер на iOS - предлагаем открыть в Safari для PWA');
        }
        setCanInstall(true);
        setShowPrompt(true);
      }, 3000);

      // Добавляем в cleanup
      return () => {
        console.log('🧹 PWA Installer: Очистка event listeners (iOS версия)');
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
        clearTimeout(fallbackTimer);
        clearTimeout(iosTimer);
      };
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
    console.log('🚀 PWA Installer: Пользователь нажал кнопку установки', {
      hasDeferredPrompt: !!deferredPrompt,
      isOpera: isOpera,
      isMobile: isMobile,
      isIOS: isIOS,
      isSafari: isSafari
    });

    // Если есть стандартный промпт - используем его
    if (deferredPrompt) {
      console.log('✅ PWA Installer: Используем deferredPrompt для установки');
      try {
        console.log('📱 PWA Installer: Вызываем deferredPrompt.prompt()...');
        await deferredPrompt.prompt();

        console.log('⏳ PWA Installer: Ожидаем выбор пользователя...');
        const choiceResult = await deferredPrompt.userChoice;

        console.log('🎯 PWA Installer: Результат выбора пользователя:', choiceResult);

        if (choiceResult.outcome === 'accepted') {
          console.log('✅ PWA Installer: Пользователь принял установку');
          setShowPrompt(false);
          setIsInstalled(true);
          onInstalled?.();
        } else {
          console.log('❌ PWA Installer: Пользователь отклонил установку');
          onDismissed?.();
        }

        setDeferredPrompt(null);
        setCanInstall(false);
      } catch (error) {
        console.error('❌ PWA Installer: Ошибка при установке PWA:', error);
      }
      return;
    }

    // Специальные инструкции для браузеров без beforeinstallprompt
    if (isOpera && isMobile) {
      console.log('🔍 PWA Installer: Показываем инструкции для Opera mobile');
      alert(
        '📱 Для установки TradeFrame на домашний экран в Opera:\n\n' +
        '1. Нажмите кнопку меню (⋮) в правом нижнем углу браузера\n' +
        '2. Выберите "Добавить на главный экран" или "Установить"\n' +
        '3. Подтвердите установку\n\n' +
        'После установки приложение будет доступно с домашнего экрана!'
      );
    } else if (isIOS && isSafari) {
      console.log('🔍 PWA Installer: Показываем инструкции для Safari iOS');
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
      console.log('🔍 PWA Installer: Сторонний браузер на iOS - предлагаем Safari');
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
      // Улучшенные инструкции для разных браузеров
      console.log('🔍 PWA Installer: Браузер не поддерживает автоматическую установку PWA');

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