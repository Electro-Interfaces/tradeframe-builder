// Диагностика загрузки для мобильных
console.log('📱 main.tsx starting...');
window.updateLoadingStatus?.('main.tsx загружается');

import { createRoot } from 'react-dom/client'
console.log('📱 React imported');
window.updateLoadingStatus?.('React импортирован');

import App from './App.tsx'
console.log('📱 App imported');
window.updateLoadingStatus?.('App компонент импортирован');

import './index.css'
import './styles/mobile.css'
console.log('📱 CSS imported');
window.updateLoadingStatus?.('CSS стили загружены');

// Импортируем тестировщик auth системы для автоматического запуска
// import './utils/authTestRunner' // Временно отключен
// Импортируем утилиту для отчетов о localStorage
import './utils/localStorageReport'

// Регистрация Service Worker для PWA с улучшенной обработкой ошибок
console.log('🔧 PWA Service Worker: Проверяем возможность регистрации...', {
  hasServiceWorker: 'serviceWorker' in navigator,
  isProd: import.meta.env.PROD,
  baseUrl: import.meta.env.BASE_URL,
  userAgent: navigator.userAgent.substring(0, 50) + '...'
});

if ('serviceWorker' in navigator) {
  console.log('🔧 PWA Service Worker: Включен для тестирования PWA в dev режиме');
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isGitHubPages = window.location.hostname === 'electro-interfaces.github.io';

  console.log('📱 PWA Service Worker: Детекция устройства:', {
    isMobile,
    isGitHubPages,
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    pathname: window.location.pathname
  });

  // Включаем Service Worker для всех устройств на GitHub Pages для PWA
  if (false) { // Всегда false - включаем SW везде
    console.log('🚫 PWA Service Worker: Отключен для мобильных GitHub Pages');
  } else {
    console.log('🚀 PWA Service Worker: Включен для всех устройств на GitHub Pages');
    // Регистрируем SW сразу, не дожидаясь load события для лучшей PWA установки
    const base = import.meta.env.BASE_URL;
    const swUrl = `${base}sw.js`;

    console.log('🚀 PWA Service Worker: Начинаем регистрацию...', { base, swUrl });

    navigator.serviceWorker.register(swUrl, { scope: base })
      .then((registration) => {
          console.log('✅ PWA Service Worker: Успешно зарегистрирован!', {
            scope: registration.scope,
            updateViaCache: registration.updateViaCache,
            active: !!registration.active,
            installing: !!registration.installing,
            waiting: !!registration.waiting
          });

          // Обработка обновлений
          registration.addEventListener('updatefound', () => {
            console.log('🔄 PWA Service Worker: Обнаружено обновление');
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                console.log('🔄 PWA Service Worker: Изменение состояния:', newWorker.state);
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('🎉 PWA Service Worker: Новая версия готова!');
                  // Можно показать уведомление об обновлении
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('❌ PWA Service Worker: Ошибка регистрации:', error);
          // Не блокируем приложение если SW не загружается
          console.log('📱 PWA Service Worker: Приложение продолжит работу без PWA функций');
        });
  }
} else {
  console.log('🚫 PWA Service Worker: Не поддерживается браузером');
}

// Глобальная функция для сброса демо данных
declare global {
  interface Window {
    resetDemoData: () => void;
    reactReady?: boolean;
  }
}

window.resetDemoData = () => {
  console.log('🔄 Сброс всех демо-данных...');
  localStorage.clear();
  console.log('✅ localStorage очищен');
  location.reload();
};

console.log('💡 Для сброса демо-данных выполните в консоли: resetDemoData()');

// Детекция браузера и платформы для диагностики
if (typeof window !== 'undefined') {
  const userAgent = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isWebView = /wv|WebView|Version.*Chrome/i.test(userAgent) && isMobile;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone;
  
  console.log('🔍 Browser Detection:', {
    userAgent: userAgent.substring(0, 50) + '...',
    isMobile,
    isWebView,
    isStandalone,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    cookiesEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine
  });

  // Специальные фиксы для WebView
  if (isWebView) {
    console.log('📱 WebView detected, applying fixes');
    document.documentElement.classList.add('webview-optimized');
  }

  // Специальные фиксы для PWA режима  
  if (isStandalone) {
    console.log('📱 PWA standalone mode detected');
    document.documentElement.classList.add('pwa-installed');
  }
}

// GitHub Pages SPA routing support с защитой от падений
if (typeof window !== 'undefined') {
  const redirectPath = sessionStorage.getItem('redirectPath');
  if (redirectPath) {
    console.log('🔄 GitHub Pages redirect detected:', redirectPath);
    sessionStorage.removeItem('redirectPath');

    try {
      // Wait for the app to initialize, then navigate to the stored path
      setTimeout(() => {
        // Extract the path without the base
        let targetPath = redirectPath;
        if (targetPath.startsWith('/tradeframe-builder')) {
          targetPath = targetPath.substring('/tradeframe-builder'.length);
        }
        if (targetPath === '' || targetPath === '/') {
          targetPath = '/';
        }

        // Валидируем что это корректный путь
        const validPaths = ['/', '/login', '/network/overview', '/point/equipment', '/point/prices', '/admin/users'];
        const isValidPath = validPaths.some(path => targetPath.startsWith(path));

        if (!isValidPath) {
          console.log('⚠️ Invalid redirect path, defaulting to root:', targetPath);
          targetPath = '/';
        }

        console.log('🔄 Redirecting from 404 to:', targetPath);
        window.history.replaceState(null, '', targetPath);
        window.dispatchEvent(new Event('popstate'));
      }, 100);
    } catch (error) {
      console.error('❌ Redirect error:', error);
      // Fallback to root path
      window.history.replaceState(null, '', '/');
    }
  }
}

// КРИТИЧЕСКАЯ ЗАЩИТА ОТ PULL-TO-REFRESH
if (typeof window !== 'undefined') {
  // Предотвращаем pull-to-refresh жестами
  let startY = 0;
  
  document.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
  }, { passive: false });
  
  document.addEventListener('touchmove', (e) => {
    const currentY = e.touches[0].clientY;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    // Проверяем, находится ли событие внутри мобильного меню
    const target = e.target as Element;
    const isInSidebar = target.closest('[role="dialog"]') ||
                       target.closest('.mobile-sidebar') ||
                       target.closest('[data-radix-dialog-content]') ||
                       target.closest('.overflow-y-scroll');

    // Если пользователь пытается скроллить вверх когда уже наверху
    // НО не внутри мобильного меню
    if (scrollTop === 0 && currentY > startY && !isInSidebar) {
      console.log('🚫 Preventing pull-to-refresh');
      e.preventDefault();
      e.stopPropagation();
    }
  }, { passive: false });
  
  // Дополнительная защита через события скролла
  document.addEventListener('scroll', (e) => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    if (scrollTop < 0) {
      window.scrollTo(0, 0);
      e.preventDefault();
      e.stopPropagation();
    }
  }, { passive: false });
  
  // Предотвращаем refresh через Meta-R, F5 и другие комбинации на мобильных
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && e.key === 'r') || e.key === 'F5') {
      console.log('🚫 Preventing keyboard refresh');
      e.preventDefault();
    }
  });
}

// Page lifecycle monitoring for auth state
if (typeof window !== 'undefined') {
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      // Check auth state after bfcache restore
      const currentUser = localStorage.getItem('tradeframe_user') || localStorage.getItem('currentUser');
      const authToken = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
      if (!currentUser || !authToken) {
        console.warn('⚠️ Auth state missing after page restore');
      }
    }
  });
}

// Clear fallback loading indicator when React is ready
window.updateLoadingStatus?.('Creating React root');

try {
  const rootElement = document.getElementById("root")!;
  window.updateLoadingStatus?.('Root element found');

  if (rootElement.innerHTML.includes('app-loading')) {
    window.updateLoadingStatus?.('Clearing loading indicator');
  }

  console.log('📱 Creating React root instance...');
  window.updateLoadingStatus?.('Инициализация React');

  const root = createRoot(rootElement);
  console.log('📱 React root created, rendering App...');
  window.updateLoadingStatus?.('Рендеринг приложения');

  // Добавляем глобальный error handler для React
  window.addEventListener('error', (e) => {
    console.error('🚨 Global error caught:', e.error);
    console.error('Error details:', {
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      stack: e.error?.stack
    });

    // Не позволяем приложению полностью упасть
    e.preventDefault();

    // Показываем пользователю что произошла ошибка
    const errorEl = document.getElementById('debug-info');
    if (errorEl) {
      errorEl.innerHTML += `<br><strong style="color: #ef4444;">⚠️ Ошибка обработана: ${e.message}</strong>`;
    }
  });

  window.addEventListener('unhandledrejection', (e) => {
    console.error('🚨 Unhandled promise rejection:', e.reason);
    e.preventDefault(); // Предотвращаем падение
  });

  root.render(<App />);
  console.log('📱 App rendered successfully!');
  window.updateLoadingStatus?.('✅ Приложение загружено');

  // Убираем initial loading индикатор через координированную задержку
  // Отключаем main.tsx таймер - пусть index.html детекция управляет
  setTimeout(() => {
    console.log('🎯 main.tsx: React готов, сигнализируем index.html');
    // Устанавливаем флаг что React готов
    window.reactReady = true;

    // Только fallback если index.html не сработал
    setTimeout(() => {
      const loadingEl = document.getElementById('initial-loading');
      if (loadingEl && loadingEl.style.display !== 'none') {
        console.log('🔧 main.tsx: Fallback удаление loading (index.html не сработал)');
        if (window.removeInitialLoading) {
          window.removeInitialLoading();
        } else {
          loadingEl.style.opacity = '0';
          loadingEl.style.transition = 'opacity 0.3s ease-out';
          setTimeout(() => loadingEl.remove(), 300);
        }
      }
    }, 200); // Даем время index.html детекции сработать
  }, 100); // Быстрая сигнализация готовности
  
} catch (error) {
  console.error('❌ React rendering failed:', error);
  window.updateLoadingStatus?.(`❌ Ошибка: ${error.message}`);
  
  // Показываем ошибку пользователю
  const debugEl = document.getElementById('debug-info');
  if (debugEl) {
    debugEl.innerHTML += `<br><strong style="color: #ef4444;">ОШИБКА: ${error.message}</strong>`;
  }
}
