import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X, Smartphone, Star, Zap, Shield } from 'lucide-react';

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

  useEffect(() => {
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
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);

      // Показываем промпт через небольшую задержку
      setTimeout(() => {
        if (!isInstalled) {
          setShowPrompt(true);
        }
      }, 2000);
    };

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
    };
  }, [isInstalled, onInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

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
      console.error('Error during PWA installation:', error);
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

  // Блокируем скролл body когда показан промпт
  useEffect(() => {
    if (showPrompt) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'auto';
      };
    }
  }, [showPrompt]);

  return (
    <>
      {/* Overlay для привлечения внимания */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-in fade-in duration-300" />

      {/* Основная карточка установки */}
      <Card className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-lg shadow-2xl border border-trade.blue/50 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 backdrop-blur-md animate-in zoom-in duration-300">
        <CardContent className="p-0">
          {/* Заголовок с градиентом */}
          <div className="bg-gradient-to-r from-trade.blue to-blue-600 p-4 rounded-t-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Smartphone className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-white">
                    🚀 Установить TradeFrame как приложение
                  </h2>
                  <p className="text-blue-100 text-sm">
                    Работайте как с нативным приложением!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Основной контент */}
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full text-sm font-medium mb-4">
                <Star className="h-4 w-4" />
                Рекомендуется для лучшего опыта
              </div>

              <p className="text-slate-300 text-sm leading-relaxed">
                Установите TradeFrame на главный экран вашего устройства для мгновенного доступа без браузера
              </p>
            </div>

            {/* Преимущества */}
            <div className="grid grid-cols-1 gap-3 mb-6">
              <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600/30">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Zap className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Быстрый запуск</p>
                  <p className="text-slate-400 text-xs">Открывается мгновенно с домашнего экрана</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600/30">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Shield className="h-4 w-4 text-green-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Автономная работа</p>
                  <p className="text-slate-400 text-xs">Работает даже при плохом соединении</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600/30">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Smartphone className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Полноэкранный режим</p>
                  <p className="text-slate-400 text-xs">Без панелей браузера, как нативное приложение</p>
                </div>
              </div>
            </div>

            {/* Инструкция */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="p-1 bg-amber-500/20 rounded">
                  <Download className="h-4 w-4 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-amber-100 text-sm font-medium mb-1">
                    Как это работает:
                  </p>
                  <p className="text-amber-200/80 text-xs leading-relaxed">
                    Нажмите "Установить сейчас" → появится системное окно → выберите "Установить" → приложение появится на главном экране
                  </p>
                </div>
              </div>
            </div>

            {/* Кнопки действий */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleInstallClick}
                size="lg"
                className="w-full bg-gradient-to-r from-trade.blue to-blue-600 hover:from-trade.blue/90 hover:to-blue-600/90 text-white font-semibold shadow-lg transform transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Download className="h-5 w-5 mr-2" />
                🚀 Установить сейчас (рекомендуется)
              </Button>

              <div className="flex gap-2">
                <Button
                  onClick={handleDismiss}
                  size="sm"
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                >
                  Напомнить позже
                </Button>

                <Button
                  onClick={handleDismiss}
                  size="sm"
                  variant="ghost"
                  className="px-3 text-slate-400 hover:text-white hover:bg-slate-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default PWAInstaller;