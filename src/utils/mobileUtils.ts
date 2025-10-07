/**
 * Комплексные утилиты для мобильных устройств и браузеров
 */

interface TouchHandler {
  element: HTMLElement;
  cleanup: () => void;
}

interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  duration: number;
}

class MobileUtils {
  private touchHandlers: Map<HTMLElement, TouchHandler> = new Map();
  private installPromptEvent: any = null;

  constructor() {
    this.initializeGlobalHandlers();
  }

  // Глобальные обработчики для мобильных устройств
  private initializeGlobalHandlers() {
    // Сохраняем install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPromptEvent = e;
    });

    // Отслеживаем установку PWA
    window.addEventListener('appinstalled', () => {
      this.installPromptEvent = null;
    });
  }

  // Определение мобильного устройства (расширенная версия)
  detectDeviceInfo() {
    const userAgent = navigator.userAgent;
    const vendor = navigator.vendor || '';
    const platform = navigator.platform || '';

    return {
      // Основные платформы
      isIOS: /iPad|iPhone|iPod/.test(userAgent),
      isAndroid: /Android/.test(userAgent),
      
      // Специфичные устройства
      isIPhone: /iPhone/.test(userAgent),
      isIPad: /iPad/.test(userAgent),
      isIPadPro: /iPad/.test(userAgent) && window.screen.width >= 1024,
      
      // Samsung устройства
      isSamsung: /Samsung/.test(userAgent) || /SM-/.test(userAgent),
      
      // Китайские бренды
      isHuawei: /Huawei|HONOR/.test(userAgent),
      isXiaomi: /Mi |Redmi|POCO/.test(userAgent),
      isOppo: /OPPO/.test(userAgent),
      isVivo: /vivo/.test(userAgent),
      isOnePlus: /OnePlus/.test(userAgent),
      
      // Размеры экрана
      screenSize: {
        width: window.screen.width,
        height: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
        pixelRatio: window.devicePixelRatio || 1
      },
      
      // Сетевая информация (если доступна)
      connection: this.getConnectionInfo(),
      
      // Память устройства (если доступна)
      deviceMemory: (navigator as any).deviceMemory || null,
      
      // Количество ядер процессора
      hardwareConcurrency: navigator.hardwareConcurrency || 1,
    };
  }

  // Информация о сетевом соединении
  private getConnectionInfo() {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (!connection) return null;
    
    return {
      effectiveType: connection.effectiveType, // '4g', '3g', '2g', 'slow-2g'
      downlink: connection.downlink, // Мбит/с
      rtt: connection.rtt, // Round-trip time в мс
      saveData: connection.saveData, // Режим экономии данных
    };
  }

  // Оптимизация для медленных соединений
  optimizeForSlowConnection() {
    const connection = this.getConnectionInfo();
    
    if (!connection) return false;
    
    const isSlowConnection = connection.effectiveType === '2g' || 
                           connection.effectiveType === 'slow-2g' ||
                           connection.downlink < 1.5 ||
                           connection.saveData;
    
    if (isSlowConnection) {
      
      // Отключаем тяжелые анимации
      document.documentElement.classList.add('slow-connection');
      
      // Уменьшаем частоту обновлений
      this.reduceUpdateFrequency();
      
      return true;
    }
    
    return false;
  }

  // Уменьшение частоты обновлений для экономии трафика
  private reduceUpdateFrequency() {
    // Увеличиваем интервалы polling
    const style = document.createElement('style');
    style.textContent = `
      .slow-connection .animate-spin { animation-duration: 2s !important; }
      .slow-connection .animate-pulse { animation-duration: 3s !important; }
      .slow-connection img { loading: lazy !important; }
    `;
    document.head.appendChild(style);
  }

  // Установка viewport height с учетом всех браузерных особенностей
  setOptimalViewportHeight() {
    const setVH = () => {
      // Основная высота
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      
      // Высота с учетом safe area
      if (CSS.supports('height', '100dvh')) {
        document.documentElement.style.setProperty('--dvh', '100dvh');
      } else {
        document.documentElement.style.setProperty('--dvh', `${window.innerHeight}px`);
      }
      
      // Для устройств с notch
      const safeAreaTop = this.getSafeAreaInset('top');
      const safeAreaBottom = this.getSafeAreaInset('bottom');
      
      document.documentElement.style.setProperty('--sat', `${safeAreaTop}px`);
      document.documentElement.style.setProperty('--sab', `${safeAreaBottom}px`);
    };

    setVH();
    
    // Обновляем при изменениях
    let resizeTimeout: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(setVH, 100);
    };
    
    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(setVH, 300); // Задержка для корректного определения размеров
    });
    
    // Для iOS - дополнительная обработка фокуса на input
    if (this.detectDeviceInfo().isIOS) {
      document.addEventListener('focusin', () => {
        setTimeout(setVH, 300);
      });
      
      document.addEventListener('focusout', () => {
        setTimeout(setVH, 300);
      });
    }
  }

  // Получение safe area insets
  private getSafeAreaInset(side: 'top' | 'right' | 'bottom' | 'left'): number {
    try {
      const testEl = document.createElement('div');
      testEl.style.position = 'absolute';
      testEl.style.left = '0';
      testEl.style.top = '0';
      testEl.style.width = '1px';
      testEl.style.height = '1px';
      testEl.style.paddingTop = `env(safe-area-inset-${side})`;
      document.body.appendChild(testEl);
      
      const computed = window.getComputedStyle(testEl);
      const padding = parseInt(computed.paddingTop) || 0;
      
      document.body.removeChild(testEl);
      return padding;
    } catch (e) {
      return 0;
    }
  }

  // Обработка жестов swipe
  addSwipeHandler(element: HTMLElement, callback: (gesture: SwipeGesture) => void, options?: {
    threshold?: number;
    allowedTime?: number;
  }) {
    const threshold = options?.threshold || 100;
    const allowedTime = options?.allowedTime || 500;
    
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startX = touch.pageX;
      startY = touch.pageY;
      startTime = Date.now();
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const endX = touch.pageX;
      const endY = touch.pageY;
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      const distanceX = endX - startX;
      const distanceY = endY - startY;
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
      
      if (duration <= allowedTime && distance >= threshold) {
        let direction: SwipeGesture['direction'];
        
        if (Math.abs(distanceX) > Math.abs(distanceY)) {
          direction = distanceX > 0 ? 'right' : 'left';
        } else {
          direction = distanceY > 0 ? 'down' : 'up';
        }
        
        callback({ direction, distance, duration });
      }
    };
    
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    const cleanup = () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
    
    this.touchHandlers.set(element, { element, cleanup });
    return cleanup;
  }

  // Предотвращение случайных нажатий (bounce protection)
  addTouchBounceProtection(element: HTMLElement) {
    let lastTouchTime = 0;
    const minInterval = 300; // мс
    
    const handleTouch = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchTime < minInterval) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      lastTouchTime = now;
    };
    
    element.addEventListener('touchstart', handleTouch, { passive: false });
    
    return () => {
      element.removeEventListener('touchstart', handleTouch);
    };
  }

  // Виброотклик с проверкой поддержки
  vibrate(pattern: number | number[] = [50]) {
    if (!navigator.vibrate) {
      return false;
    }
    
    try {
      navigator.vibrate(pattern);
      return true;
    } catch (e) {
      console.warn('📳 Ошибка вибрации:', e);
      return false;
    }
  }

  // Умная вибрация с учетом контекста
  contextVibrate(type: 'success' | 'error' | 'warning' | 'notification' = 'notification') {
    const patterns = {
      success: [100],
      error: [100, 50, 100],
      warning: [50, 50, 50],
      notification: [50]
    };
    
    return this.vibrate(patterns[type]);
  }

  // Проверка и показ install prompt для PWA
  async showInstallPrompt(): Promise<boolean> {
    if (!this.installPromptEvent) {
      return false;
    }
    
    try {
      const result = await this.installPromptEvent.prompt();
      
      if (result.outcome === 'accepted') {
        this.installPromptEvent = null;
        return true;
      }
      
      return false;
    } catch (e) {
      console.error('📱 Ошибка install prompt:', e);
      return false;
    }
  }

  // Проверка, установлено ли приложение как PWA
  isPWAInstalled(): boolean {
    // Проверяем display-mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }
    
    // iOS Safari
    if ((window.navigator as any).standalone === true) {
      return true;
    }
    
    // Android
    if (document.referrer.includes('android-app://')) {
      return true;
    }
    
    return false;
  }

  // Оптимизация изображений для мобильных
  optimizeImages() {
    const images = document.querySelectorAll('img');
    const deviceInfo = this.detectDeviceInfo();
    
    images.forEach(img => {
      // Lazy loading
      if ('loading' in img) {
        img.loading = 'lazy';
      }
      
      // Уменьшаем качество для медленных соединений
      const connection = this.getConnectionInfo();
      if (connection?.effectiveType === '2g' || connection?.saveData) {
        img.style.filter = 'contrast(0.9) brightness(1.1)';
      }
      
      // Адаптируем размеры под pixel ratio
      if (deviceInfo.screenSize.pixelRatio > 2) {
        const width = img.width || 300;
        const height = img.height || 200;
        img.style.width = `${width}px`;
        img.style.height = `${height}px`;
      }
    });
  }

  // Очистка всех обработчиков
  cleanup() {
    this.touchHandlers.forEach(handler => {
      handler.cleanup();
    });
    this.touchHandlers.clear();
  }

  // Диагностика мобильного устройства
  generateDiagnostics() {
    const deviceInfo = this.detectDeviceInfo();
    const connection = this.getConnectionInfo();
    
    return {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      device: deviceInfo,
      network: connection,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
      },
      features: {
        touchSupport: 'ontouchstart' in window,
        serviceWorker: 'serviceWorker' in navigator,
        pushManager: 'PushManager' in window,
        notifications: 'Notification' in window,
        geolocation: 'geolocation' in navigator,
        camera: 'getUserMedia' in navigator.mediaDevices,
      },
      performance: {
        deviceMemory: deviceInfo.deviceMemory,
        hardwareConcurrency: deviceInfo.hardwareConcurrency,
        connection: connection?.effectiveType,
      },
    };
  }
}

// Экспортируем singleton
export const mobileUtils = new MobileUtils();

// Дополнительные утилиты
export const mobileHelpers = {
  // Проверка, нужно ли показать мобильную версию интерфейса
  shouldUseMobileUI: (): boolean => {
    const deviceInfo = mobileUtils.detectDeviceInfo();
    return window.innerWidth < 768 || deviceInfo.isIOS || deviceInfo.isAndroid;
  },

  // Получение оптимального размера тача для устройства
  getOptimalTouchTargetSize: (): number => {
    const deviceInfo = mobileUtils.detectDeviceInfo();
    
    // Для устройств с высокой плотностью пикселей
    if (deviceInfo.screenSize.pixelRatio > 2) {
      return 48; // px
    }
    
    // Для планшетов
    if (deviceInfo.isIPad || (deviceInfo.isAndroid && window.innerWidth > 600)) {
      return 44;
    }
    
    // Для телефонов
    return 40;
  },

  // Определение безопасной области для контента
  getSafeContentArea: () => {
    const safeAreaTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat')) || 0;
    const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sab')) || 0;
    
    return {
      top: safeAreaTop,
      bottom: safeAreaBottom,
      height: window.innerHeight - safeAreaTop - safeAreaBottom,
    };
  },
};