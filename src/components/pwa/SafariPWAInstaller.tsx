/**
 * Улучшенный PWA Installer специально для iOS Safari
 * Показывает визуальные анимированные инструкции
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Share, Plus, Smartphone } from 'lucide-react';

interface SafariPWAInstallerProps {
  onDismissed?: () => void;
}

export const SafariPWAInstaller: React.FC<SafariPWAInstallerProps> = ({ onDismissed }) => {
  const [show, setShow] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Проверяем, не отклонил ли уже пользователь установку
    const dismissedTime = localStorage.getItem('safari-pwa-install-dismissed');
    if (dismissedTime) {
      const timeSinceDismiss = Date.now() - parseInt(dismissedTime);
      const oneDayMs = 24 * 60 * 60 * 1000;

      if (timeSinceDismiss < oneDayMs) {
        return;
      } else {
        localStorage.removeItem('safari-pwa-install-dismissed');
      }
    }

    // Детекция iOS Safari
    const userAgent = navigator.userAgent;
    const detectedIOS = /iPad|iPhone|iPod/.test(userAgent);
    const detectedSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent) && !/CriOS/i.test(userAgent);

    setIsIOS(detectedIOS);
    setIsSafari(detectedSafari);

    // Проверяем, установлено ли уже
    const standaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const navigatorStandalone = (window.navigator as any).standalone;

    if (standaloneMode || navigatorStandalone) {
      setIsInstalled(true);
      return;
    }

    // Показываем только для iOS Safari и если не установлено
    if (detectedIOS && detectedSafari && !standaloneMode && !navigatorStandalone) {
      // Задержка перед показом (5 секунд)
      const timer = setTimeout(() => {
        setShow(true);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleShowInstructions = () => {
    setShowInstructions(true);
  };

  const handleDismiss = () => {
    setShow(false);
    setShowInstructions(false);
    localStorage.setItem('safari-pwa-install-dismissed', Date.now().toString());
    onDismissed?.();
  };

  if (isInstalled || !show || !isSafari || !isIOS) {
    return null;
  }

  // Простой промпт
  if (!showInstructions) {
    return (
      <Card className="fixed bottom-4 left-4 right-4 z-50 shadow-2xl border-2 border-blue-500/50 bg-gradient-to-r from-blue-900/95 to-blue-800/95 backdrop-blur-md md:max-w-md md:left-auto md:right-4 animate-in slide-in-from-bottom-5 duration-500">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="bg-blue-500/20 p-2 rounded-full">
                <Smartphone className="h-6 w-6 text-blue-400" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-blue-400 mb-1">
                📱 Установить TradeFrame на iOS
              </h3>
              <p className="text-xs text-blue-200 mb-3">
                Получите лучший опыт использования с установкой на домашний экран
              </p>

              <div className="flex gap-2">
                <Button
                  onClick={handleShowInstructions}
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold shadow-lg"
                >
                  <Share className="h-4 w-4 mr-1" />
                  Показать инструкции
                </Button>

                <Button
                  onClick={handleDismiss}
                  size="sm"
                  variant="ghost"
                  className="text-blue-300 hover:text-blue-200 hover:bg-blue-900/30"
                >
                  Позже
                </Button>
              </div>
            </div>

            <Button
              onClick={handleDismiss}
              size="sm"
              variant="ghost"
              className="flex-shrink-0 h-6 w-6 p-0 text-blue-400 hover:text-blue-200 hover:bg-blue-900/30"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Визуальные инструкции
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-lg bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-blue-500/50 shadow-2xl animate-in zoom-in-95 duration-300">
        <CardContent className="p-6">
          {/* Заголовок */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/20 p-3 rounded-full">
                <Smartphone className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Установка на iOS</h2>
                <p className="text-sm text-slate-400">Safari — всего 3 шага</p>
              </div>
            </div>
            <Button
              onClick={handleDismiss}
              size="sm"
              variant="ghost"
              className="text-slate-400 hover:text-white hover:bg-slate-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Инструкции */}
          <div className="space-y-6">
            {/* Шаг 1 */}
            <div className="flex gap-4 items-start group">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                  Нажмите кнопку "Поделиться"
                  <Share className="h-5 w-5 text-blue-400 animate-bounce" />
                </h3>
                <p className="text-slate-300 text-sm mb-3">
                  Найдите иконку "Поделиться" в нижней панели Safari
                </p>
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-center justify-center">
                  <div className="relative">
                    {/* Имитация кнопки Safari Share */}
                    <div className="bg-blue-500/20 border-2 border-blue-500 rounded-lg p-3 animate-pulse">
                      <Share className="h-8 w-8 text-blue-400" />
                    </div>
                    {/* Анимированная стрелка */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-blue-400 animate-bounce">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 4l-8 8h5v8h6v-8h5z"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Разделитель */}
            <div className="border-t border-slate-700"></div>

            {/* Шаг 2 */}
            <div className="flex gap-4 items-start group">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                  Выберите "На экран Домой"
                  <Plus className="h-5 w-5 text-blue-400" />
                </h3>
                <p className="text-slate-300 text-sm mb-3">
                  Прокрутите список действий и найдите эту опцию
                </p>
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="bg-slate-700/50 rounded p-2 text-slate-400 text-sm flex items-center gap-2">
                      <div className="w-6 h-6 bg-slate-600 rounded"></div>
                      Сообщение
                    </div>
                    <div className="bg-slate-700/50 rounded p-2 text-slate-400 text-sm flex items-center gap-2">
                      <div className="w-6 h-6 bg-slate-600 rounded"></div>
                      Копировать
                    </div>
                    <div className="bg-blue-600/20 border-2 border-blue-500 rounded p-2 text-white font-semibold text-sm flex items-center gap-2 animate-pulse">
                      <Plus className="w-6 h-6 text-blue-400" />
                      На экран "Домой"
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Разделитель */}
            <div className="border-t border-slate-700"></div>

            {/* Шаг 3 */}
            <div className="flex gap-4 items-start group">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-2">
                  Нажмите "Добавить"
                </h3>
                <p className="text-slate-300 text-sm mb-3">
                  Подтвердите установку приложения
                </p>
                <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-500/50 rounded-lg p-4 text-center">
                  <p className="text-green-400 font-semibold mb-2">✨ Готово!</p>
                  <p className="text-slate-300 text-sm">
                    TradeFrame появится на домашнем экране
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Кнопка закрытия */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <Button
              onClick={handleDismiss}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold"
            >
              Понятно, спасибо!
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SafariPWAInstaller;
