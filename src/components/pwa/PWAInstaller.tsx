import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X, Smartphone, MoreVertical, Share } from 'lucide-react';

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

  useEffect(() => {
    // Определяем браузер и устройство
    const userAgent = navigator.userAgent;
    const detectedOpera = /Opera|OPR\//i.test(userAgent);
    const detectedMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isYandex = /YaBrowser|YandexBrowser/i.test(userAgent);
    const isFirefox = /Firefox/i.test(userAgent);
    const isChrome = /Chrome/i.test(userAgent) && !/Edg/i.test(userAgent) && !/YaBrowser/i.test(userAgent);
    const detectedSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent) && !/Chromium/i.test(userAgent);
    const detectedIOS = /iPad|iPhone|iPod/.test(userAgent);

    setIsOpera(detectedOpera);
    setIsMobile(detectedMobile);
    setIsYandex(isYandex);
    setIsFirefox(isFirefox);
    setIsChrome(isChrome);
    setIsSafari(detectedSafari);
    setIsIOS(detectedIOS);

    console.log('🔍 PWA Installer: Определение браузера:', {
      userAgent: userAgent.substring(0, 50) + '...',
      isOpera: detectedOpera,
      isMobile: detectedMobile,
      isYandex,
      isFirefox,
      isChrome,
      isSafari: detectedSafari,
      isIOS: detectedIOS
    });

    // Проверяем, установлено ли уже приложение
    const checkInstalled = () => {
      // Проверяем standalone режим
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return;
      }

      // Проверяем Navigator standalone (iOS Safari)
      if ((window.navigator as any).standalone) {
        setIsInstalled(true);
        return;
      }
    };

    checkInstalled();

    // Слушаем событие beforeinstallprompt
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      console.log('📱 PWA Installer: beforeinstallprompt получен');
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);

      // Показываем промпт через небольшую задержку
      setTimeout(() => {
        if (!isInstalled) {
          setShowPrompt(true);
        }
      }, 3000);
    };

    // Для браузеров с ограниченной beforeinstallprompt поддержкой
    const fallbackTimer = setTimeout(() => {
      if (!canInstall && !isInstalled) {
        // Opera Mobile - иногда поддерживает beforeinstallprompt, даем больше времени
        if (detectedOpera && detectedMobile) {
          console.log('🔍 PWA Installer: Opera mobile - beforeinstallprompt не сработал за 5 сек, показываем инструкции');
          setCanInstall(true);
          setShowPrompt(true);
        }
      }
    }, 5000);

    // iOS особенность: ВСЕ браузеры на iOS используют WebKit Safari движок
    // Только Safari может устанавливать PWA, остальные браузеры показывают предложение открыть в Safari
    if (detectedIOS && !isInstalled) {
      const iosTimer = setTimeout(() => {
        if (detectedSafari) {
          console.log('🔍 PWA Installer: Safari iOS - показываем инструкции установки PWA');
        } else {
          console.log('🔍 PWA Installer: Сторонний браузер на iOS - предлагаем открыть в Safari для PWA');
        }
        setCanInstall(true);
        setShowPrompt(true);
      }, 3000);

      // Добавляем в cleanup
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
        clearTimeout(fallbackTimer);
        clearTimeout(iosTimer);
      };
    }

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
        console.error('Ошибка при установке PWA:', error);
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
        '📱 Для установки TradeFrame на главный экран в Safari (iOS):\n\n' +
        '1. Нажмите кнопку "Поделиться" (□↗) внизу экрана\n' +
        '2. Прокрутите вниз и выберите "На экран Домой"\n' +
        '3. При необходимости отредактируйте название\n' +
        '4. Нажмите "Добавить"\n\n' +
        'После установки приложение будет работать как нативное!'
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
      // Для других браузеров без beforeinstallprompt
      console.log('🔍 PWA Installer: Браузер не поддерживает автоматическую установку PWA');
      alert(
        '📱 Ваш браузер не поддерживает автоматическую установку приложений.\n\n' +
        'Попробуйте найти опцию "Установить приложение" или "Добавить на главный экран" в меню браузера.'
      );
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