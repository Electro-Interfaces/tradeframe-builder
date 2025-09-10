/**
 * Хук для определения мобильного устройства и touch интерфейса
 */

import { useState, useEffect } from 'react';

interface MobileInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  screenSize: {
    width: number;
    height: number;
  };
  orientation: 'portrait' | 'landscape';
  isIOS: boolean;
  isAndroid: boolean;
  isPWA: boolean;
}

export function useMobile(): MobileInfo {
  const [mobileInfo, setMobileInfo] = useState<MobileInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouchDevice: false,
        screenSize: { width: 1920, height: 1080 },
        orientation: 'landscape',
        isIOS: false,
        isAndroid: false,
        isPWA: false,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width < 768;
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const orientation = width > height ? 'landscape' : 'portrait';
    
    // Определяем операционную систему
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    
    // Определяем, запущено ли как PWA
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  window.navigator.standalone === true ||
                  document.referrer.includes('android-app://');

    return {
      isMobile,
      isTablet,
      isDesktop,
      isTouchDevice,
      screenSize: { width, height },
      orientation,
      isIOS,
      isAndroid,
      isPWA,
    };
  });

  useEffect(() => {
    const updateMobileInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = width >= 1024;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const orientation = width > height ? 'landscape' : 'portrait';
      
      const userAgent = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent);
      const isAndroid = /Android/.test(userAgent);
      
      const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                    window.navigator.standalone === true ||
                    document.referrer.includes('android-app://');

      setMobileInfo({
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        screenSize: { width, height },
        orientation,
        isIOS,
        isAndroid,
        isPWA,
      });
    };

    // Обновляем при изменении размера окна
    window.addEventListener('resize', updateMobileInfo);
    window.addEventListener('orientationchange', updateMobileInfo);

    // Обновляем при изменении display-mode (PWA)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    if (mediaQuery.addListener) {
      mediaQuery.addListener(updateMobileInfo);
    } else if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updateMobileInfo);
    }

    return () => {
      window.removeEventListener('resize', updateMobileInfo);
      window.removeEventListener('orientationchange', updateMobileInfo);
      
      if (mediaQuery.removeListener) {
        mediaQuery.removeListener(updateMobileInfo);
      } else if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', updateMobileInfo);
      }
    };
  }, []);

  return mobileInfo;
}

// Дополнительные утилиты для мобильных устройств
export const mobileUtils = {
  // Виброотклик (если поддерживается)
  vibrate: (pattern: number | number[] = 50) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  },

  // Предотвращение зума при double-tap
  preventZoom: (element: HTMLElement) => {
    let lastTouchEnd = 0;
    element.addEventListener('touchend', (event) => {
      const now = new Date().getTime();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
  },

  // Скрытие адресной строки (для старых браузеров)
  hideAddressBar: () => {
    if (window.scrollTo && window.innerHeight && window.outerHeight) {
      setTimeout(() => {
        window.scrollTo(0, 1);
      }, 100);
    }
  },

  // Установка viewport height с учетом mobile browsers
  setViewportHeight: () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  },
};