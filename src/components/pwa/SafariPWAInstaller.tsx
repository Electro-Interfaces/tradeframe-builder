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
      <Card
        className="fixed left-4 right-4 z-50 shadow-2xl border border-border bg-card backdrop-blur-md md:max-w-md md:mx-auto md:left-4 md:right-4 animate-in slide-in-from-bottom-5 duration-500"
        style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-full">
                <Smartphone className="h-6 w-6 text-primary dark:text-primary/70" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-foreground mb-1">
                Установить TradePoint на iOS
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Получите лучший опыт использования с установкой на домашний экран
              </p>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleShowInstructions}
                  size="sm"
                  className="bg-primary hover:bg-primary/80 text-white font-semibold shadow-sm"
                >
                  <Share className="h-4 w-4 mr-1" />
                  Показать инструкции
                </Button>

                <Button
                  onClick={handleDismiss}
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Позже
                </Button>
              </div>
            </div>

            <Button
              onClick={handleDismiss}
              size="sm"
              variant="ghost"
              className="flex-shrink-0 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
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
      <Card className="w-full max-w-lg bg-gradient-to-br from-background to-card border-2 border-primary/50 shadow-2xl animate-in zoom-in-95 duration-300">
        <CardContent className="p-6">
          {/* Заголовок */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 dark:bg-primary/20 p-3 rounded-full">
                <Smartphone className="h-8 w-8 text-primary dark:text-primary/70" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Установка на iOS</h2>
                <p className="text-sm text-muted-foreground">Safari — всего 3 шага</p>
              </div>
            </div>
            <Button
              onClick={handleDismiss}
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Инструкции */}
          <div className="space-y-6">
            {/* Шаг 1 */}
            <div className="flex gap-4 items-start group">
              <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-foreground font-semibold mb-2 flex items-center gap-2">
                  Нажмите кнопку "Поделиться"
                  <Share className="h-5 w-5 text-primary dark:text-primary/70 animate-bounce" />
                </h3>
                <p className="text-foreground/80 text-sm mb-3">
                  Найдите иконку "Поделиться" в нижней панели Safari
                </p>
                <div className="bg-card/50 border border-border rounded-lg p-4 flex items-center justify-center">
                  <div className="relative">
                    {/* Имитация кнопки Safari Share */}
                    <div className="bg-primary/10 dark:bg-primary/20 border-2 border-primary rounded-lg p-3 animate-pulse">
                      <Share className="h-8 w-8 text-primary dark:text-primary/70" />
                    </div>
                    {/* Анимированная стрелка */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-primary dark:text-primary/70 animate-bounce">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 4l-8 8h5v8h6v-8h5z"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Разделитель */}
            <div className="border-t border-border"></div>

            {/* Шаг 2 */}
            <div className="flex gap-4 items-start group">
              <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-foreground font-semibold mb-2 flex items-center gap-2">
                  Выберите "На экран Домой"
                  <Plus className="h-5 w-5 text-primary dark:text-primary/70" />
                </h3>
                <p className="text-foreground/80 text-sm mb-3">
                  Прокрутите список действий и найдите эту опцию
                </p>
                <div className="bg-card/50 border border-border rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="bg-secondary/50 rounded p-2 text-muted-foreground text-sm flex items-center gap-2">
                      <div className="w-6 h-6 bg-secondary rounded"></div>
                      Сообщение
                    </div>
                    <div className="bg-secondary/50 rounded p-2 text-muted-foreground text-sm flex items-center gap-2">
                      <div className="w-6 h-6 bg-secondary rounded"></div>
                      Копировать
                    </div>
                    <div className="bg-primary/20 border-2 border-primary rounded p-2 text-white font-semibold text-sm flex items-center gap-2 animate-pulse">
                      <Plus className="w-6 h-6 text-primary dark:text-primary/70" />
                      На экран "Домой"
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Разделитель */}
            <div className="border-t border-border"></div>

            {/* Шаг 3 */}
            <div className="flex gap-4 items-start group">
              <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-foreground font-semibold mb-2">
                  Нажмите "Добавить"
                </h3>
                <p className="text-foreground/80 text-sm mb-3">
                  Подтвердите установку приложения
                </p>
                <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-500/50 rounded-lg p-4 text-center">
                  <p className="text-green-600 dark:text-green-400 font-semibold mb-2">✨ Готово!</p>
                  <p className="text-foreground/80 text-sm">
                    TradePoint появится на домашнем экране
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Кнопка закрытия */}
          <div className="mt-6 pt-6 border-t border-border">
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
