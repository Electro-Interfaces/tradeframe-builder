/**
 * Хук для детального определения мобильного браузера и его характеристик
 */

import { useState, useEffect } from 'react';

interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  isWebView: boolean;
  supportsPWA: boolean;
  hasNotch: boolean;
  viewportQuirks: string[];
  requiredPolyfills: string[];
  cssFeatures: {
    hasViewportUnits: boolean;
    hasSafeArea: boolean;
    hasDisplayCutout: boolean;
    hasHover: boolean;
  };
}

interface BrowserCapabilities {
  maxTouchPoints: number;
  hasVibration: boolean;
  hasGeolocation: boolean;
  hasOrientation: boolean;
  hasFullscreen: boolean;
  hasInstallPrompt: boolean;
  cookieEnabled: boolean;
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
}

export function useBrowserDetection(): BrowserInfo & { capabilities: BrowserCapabilities } {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo & { capabilities: BrowserCapabilities }>(() => {
    if (typeof window === 'undefined') {
      return getDefaultBrowserInfo();
    }
    return detectBrowser();
  });

  useEffect(() => {
    const updateBrowserInfo = () => {
      setBrowserInfo(detectBrowser());
    };

    // Обновляем при изменении ориентации или размера
    window.addEventListener('resize', updateBrowserInfo);
    window.addEventListener('orientationchange', updateBrowserInfo);

    return () => {
      window.removeEventListener('resize', updateBrowserInfo);
      window.removeEventListener('orientationchange', updateBrowserInfo);
    };
  }, []);

  return browserInfo;
}

function getDefaultBrowserInfo(): BrowserInfo & { capabilities: BrowserCapabilities } {
  return {
    name: 'unknown',
    version: '0.0.0',
    engine: 'unknown',
    platform: 'unknown',
    isWebView: false,
    supportsPWA: false,
    hasNotch: false,
    viewportQuirks: [],
    requiredPolyfills: [],
    cssFeatures: {
      hasViewportUnits: false,
      hasSafeArea: false,
      hasDisplayCutout: false,
      hasHover: false,
    },
    capabilities: {
      maxTouchPoints: 0,
      hasVibration: false,
      hasGeolocation: false,
      hasOrientation: false,
      hasFullscreen: false,
      hasInstallPrompt: false,
      cookieEnabled: false,
      localStorage: false,
      sessionStorage: false,
      indexedDB: false,
    },
  };
}

function detectBrowser(): BrowserInfo & { capabilities: BrowserCapabilities } {
  const userAgent = navigator.userAgent;
  const vendor = navigator.vendor || '';
  
  // Определяем браузер и версию
  const browserDetection = detectBrowserName(userAgent);
  const platform = detectPlatform(userAgent);
  const engine = detectEngine(userAgent);
  
  // Определяем специфичные особенности
  const isWebView = detectWebView(userAgent);
  const supportsPWA = checkPWASupport();
  const hasNotch = detectNotch();
  const viewportQuirks = detectViewportQuirks(browserDetection.name, platform);
  const requiredPolyfills = detectRequiredPolyfills(browserDetection.name, browserDetection.version);
  const cssFeatures = detectCSSFeatures();
  const capabilities = detectCapabilities();

  return {
    name: browserDetection.name,
    version: browserDetection.version,
    engine,
    platform,
    isWebView,
    supportsPWA,
    hasNotch,
    viewportQuirks,
    requiredPolyfills,
    cssFeatures,
    capabilities,
  };
}

function detectBrowserName(userAgent: string): { name: string; version: string } {
  const browsers = [
    // Mobile браузеры (проверяем сначала специфичные)
    { name: 'Samsung Internet', pattern: /SamsungBrowser\/(\d+\.\d+)/ },
    { name: 'MIUI Browser', pattern: /MiuiBrowser\/(\d+\.\d+)/ },
    { name: 'Huawei Browser', pattern: /HuaweiBrowser\/(\d+\.\d+)/ },
    { name: 'UC Browser', pattern: /UCBrowser\/(\d+\.\d+)/ },
    { name: 'Opera Mini', pattern: /Opera Mini\/(\d+\.\d+)/ },
    { name: 'Opera Mobile', pattern: /Opera Mobi.*Version\/(\d+\.\d+)/ },
    { name: 'QQ Browser', pattern: /MQQBrowser\/(\d+\.\d+)/ },
    // Улучшенная детекция Yandex Browser (поддерживает YaBrowser и YandexBrowser)
    { name: 'Yandex Browser', pattern: /(?:YaBrowser|YandexBrowser)\/(\d+\.\d+)/ },

    // Основные браузеры
    { name: 'Chrome', pattern: /Chrome\/(\d+\.\d+)/ },
    { name: 'Firefox', pattern: /Firefox\/(\d+\.\d+)/ },
    { name: 'Safari', pattern: /Version\/(\d+\.\d+).*Safari/ },
    { name: 'Edge', pattern: /Edg\/(\d+\.\d+)/ },

    // WebView
    { name: 'Android WebView', pattern: /wv.*Chrome\/(\d+\.\d+)/ },
    { name: 'iOS WebView', pattern: /Mobile\/.*Safari/ },
  ];

  for (const browser of browsers) {
    const match = userAgent.match(browser.pattern);
    if (match) {
      return { name: browser.name, version: match[1] || '0.0' };
    }
  }

  return { name: 'Unknown', version: '0.0' };
}

function detectPlatform(userAgent: string): 'ios' | 'android' | 'desktop' | 'unknown' {
  if (/iPad|iPhone|iPod/.test(userAgent)) return 'ios';
  if (/Android/.test(userAgent)) return 'android';
  if (/Windows|Mac|Linux/.test(userAgent)) return 'desktop';
  return 'unknown';
}

function detectEngine(userAgent: string): string {
  if (/WebKit/.test(userAgent)) {
    if (/Blink/.test(userAgent)) return 'Blink';
    return 'WebKit';
  }
  if (/Gecko/.test(userAgent)) return 'Gecko';
  if (/Trident/.test(userAgent)) return 'Trident';
  return 'Unknown';
}

function detectWebView(userAgent: string): boolean {
  // Android WebView
  if (/wv/.test(userAgent) && /Chrome/.test(userAgent)) return true;
  
  // iOS WebView (отсутствует Safari в строке)
  if (/iPhone|iPad/.test(userAgent) && !/Safari/.test(userAgent)) return true;
  
  // Специфичные WebView паттерны
  if (/WebView/.test(userAgent)) return true;
  if (window.navigator && !window.navigator.standalone && /Mobile/.test(userAgent)) {
    return !(/Safari/.test(userAgent));
  }
  
  return false;
}

function checkPWASupport(): boolean {
  return 'serviceWorker' in navigator && 'Cache' in window && 'caches' in window;
}

function detectNotch(): boolean {
  // iPhone X+ series detection
  if (typeof window !== 'undefined') {
    const ratio = window.screen.width / window.screen.height;
    const hasNotchRatio = ratio > 1.7 && ratio < 2.5; // Notch devices typically have this ratio
    
    // CSS environment variables support
    const supportsEnv = CSS.supports('padding-top: env(safe-area-inset-top)');
    
    return hasNotchRatio && supportsEnv;
  }
  return false;
}

function detectViewportQuirks(browserName: string, platform: string): string[] {
  const quirks: string[] = [];
  
  // iOS Safari viewport quirks
  if (platform === 'ios' && browserName === 'Safari') {
    quirks.push('ios-safari-viewport-bug');
    quirks.push('ios-100vh-bug');
    quirks.push('ios-bounce-scroll');
  }
  
  // Android Chrome viewport issues
  if (platform === 'android' && browserName === 'Chrome') {
    quirks.push('android-keyboard-resize');
    quirks.push('android-chrome-tabs');
  }
  
  // Samsung Internet specific issues
  if (browserName === 'Samsung Internet') {
    quirks.push('samsung-internet-scroll');
    quirks.push('samsung-internet-zoom');
  }
  
  // UC Browser issues
  if (browserName === 'UC Browser') {
    quirks.push('uc-browser-proxy');
    quirks.push('uc-browser-compression');
  }
  
  return quirks;
}

function detectRequiredPolyfills(browserName: string, version: string): string[] {
  const polyfills: string[] = [];
  const majorVersion = parseInt(version.split('.')[0]);
  
  // CSS Custom Properties
  if (browserName === 'Samsung Internet' && majorVersion < 8) {
    polyfills.push('css-custom-properties');
  }
  
  // Intersection Observer
  if (browserName === 'UC Browser' || (browserName === 'Safari' && majorVersion < 12)) {
    polyfills.push('intersection-observer');
  }
  
  // ResizeObserver
  if (majorVersion < 64) {
    polyfills.push('resize-observer');
  }
  
  return polyfills;
}

function detectCSSFeatures() {
  return {
    hasViewportUnits: CSS.supports('height', '100vh'),
    hasSafeArea: CSS.supports('padding-top', 'env(safe-area-inset-top)'),
    hasDisplayCutout: CSS.supports('padding-top', 'env(titlebar-area-height)'),
    hasHover: window.matchMedia('(hover: hover)').matches,
  };
}

function detectCapabilities(): BrowserCapabilities {
  return {
    maxTouchPoints: navigator.maxTouchPoints || 0,
    hasVibration: 'vibrate' in navigator,
    hasGeolocation: 'geolocation' in navigator,
    hasOrientation: 'orientation' in screen || 'onorientationchange' in window,
    hasFullscreen: 'requestFullscreen' in document.documentElement,
    hasInstallPrompt: 'onbeforeinstallprompt' in window,
    cookieEnabled: navigator.cookieEnabled,
    localStorage: (() => {
      try {
        return 'localStorage' in window && window.localStorage !== null;
      } catch (e) {
        return false;
      }
    })(),
    sessionStorage: (() => {
      try {
        return 'sessionStorage' in window && window.sessionStorage !== null;
      } catch (e) {
        return false;
      }
    })(),
    indexedDB: 'indexedDB' in window,
  };
}

// Утилиты для работы с браузер-специфичными фиксами
export const browserUtils = {
  // Применить фиксы для конкретного браузера
  applyBrowserFixes: (browserInfo: BrowserInfo) => {
    
    // iOS Safari фиксы
    if (browserInfo.platform === 'ios' && browserInfo.name === 'Safari') {
      applyIOSSafariFixes();
    }
    
    // Android Chrome фиксы
    if (browserInfo.platform === 'android' && browserInfo.name === 'Chrome') {
      applyAndroidChromeFixes();
    }
    
    // Samsung Internet фиксы
    if (browserInfo.name === 'Samsung Internet') {
      applySamsungInternetFixes();
    }
    
    // UC Browser фиксы
    if (browserInfo.name === 'UC Browser') {
      applyUCBrowserFixes();
    }
    
    // WebView фиксы
    if (browserInfo.isWebView) {
      applyWebViewFixes();
    }
  },
  
  // Определить нужно ли показывать install prompt
  shouldShowInstallPrompt: (browserInfo: BrowserInfo) => {
    return browserInfo.capabilities.hasInstallPrompt && browserInfo.supportsPWA;
  },
  
  // Оптимизировать производительность для браузера
  optimizePerformance: (browserInfo: BrowserInfo) => {
    if (browserInfo.name === 'UC Browser') {
      // Отключаем некоторые анимации для UC Browser
      document.documentElement.classList.add('reduce-animations');
    }
    
    if (browserInfo.platform === 'android' && browserInfo.capabilities.maxTouchPoints > 5) {
      // Оптимизация для устройств с большим количеством точек касания
      document.documentElement.classList.add('multi-touch-optimize');
    }
  },
};

// Специфичные фиксы для браузеров
function applyIOSSafariFixes() {
  // Фикс для 100vh на iOS
  const setIOSViewportHeight = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };
  
  setIOSViewportHeight();
  window.addEventListener('resize', setIOSViewportHeight);
  window.addEventListener('orientationchange', () => {
    setTimeout(setIOSViewportHeight, 500);
  });
  
  // Предотвращение bounce scroll
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });
  
  // Фикс для input focus
  const inputs = document.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    input.addEventListener('focus', () => {
      setTimeout(() => {
        if (document.activeElement === input) {
          input.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }, 300);
    });
  });
}

function applyAndroidChromeFixes() {
  // Фикс для клавиатуры
  let initialViewportHeight = window.visualViewport?.height || window.innerHeight;
  
  const handleViewportChange = () => {
    const currentHeight = window.visualViewport?.height || window.innerHeight;
    const keyboardOpen = currentHeight < initialViewportHeight * 0.75;
    
    document.documentElement.classList.toggle('keyboard-open', keyboardOpen);
  };
  
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleViewportChange);
  } else {
    window.addEventListener('resize', handleViewportChange);
  }
}

function applySamsungInternetFixes() {
  // Фикс для масштабирования
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = new Date().getTime();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });
  
  // Фикс для скроллинга
  document.documentElement.style.setProperty('-webkit-overflow-scrolling', 'touch');
}

function applyUCBrowserFixes() {
  // Отключаем некоторые CSS анимации для лучшей производительности
  document.documentElement.classList.add('uc-browser-optimizations');
  
  // Фикс для background-attachment
  const elements = document.querySelectorAll('[style*="background-attachment"]');
  elements.forEach(el => {
    const element = el as HTMLElement;
    element.style.backgroundAttachment = 'scroll';
  });
}

function applyWebViewFixes() {
  // Общие фиксы для WebView
  
  // Отключаем выделение текста
  document.onselectstart = () => false;
  document.oncontextmenu = () => false;
  
  // Оптимизируем touch events
  document.addEventListener('touchmove', (e) => {
    e.preventDefault();
  }, { passive: false });
}