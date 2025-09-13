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
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isGitHubPages = window.location.hostname === 'electro-interfaces.github.io';
  
  // Отключаем Service Worker для мобильных устройств на GitHub Pages
  if (isMobile && isGitHubPages) {
    console.log('🚫 Service Worker disabled for mobile GitHub Pages');
  } else {
    window.addEventListener('load', () => {
      const swPath = import.meta.env.PROD ? '/tradeframe-builder/sw.js' : '/sw.js';
      
      navigator.serviceWorker.register(swPath)
        .then((registration) => {
          console.log('✅ SW registered:', registration.scope);
          
          // Обработка обновлений
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('🔄 New version available');
                  // Можно показать уведомление об обновлении
                }
              });
            }
          });
        })
        .catch((error) => {
          console.log('❌ SW registration failed:', error);
          // Не блокируем приложение если SW не загружается
          console.log('📱 App will continue without PWA features');
        });
    });
  }
} else if (!('serviceWorker' in navigator)) {
  console.log('🚫 Service Worker not supported in this browser');
} else {
  console.log('🔧 Service Worker disabled in development mode');
}

// Глобальная функция для сброса демо данных
declare global {
  interface Window {
    resetDemoData: () => void;
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

// GitHub Pages SPA routing support
if (typeof window !== 'undefined') {
  const redirectPath = sessionStorage.getItem('redirectPath');
  if (redirectPath) {
    sessionStorage.removeItem('redirectPath');
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
      console.log('🔄 Redirecting from 404 to:', targetPath);
      window.history.replaceState(null, '', targetPath);
      window.dispatchEvent(new Event('popstate'));
    }, 100);
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

// Отладка pull-to-refresh проблемы
if (typeof window !== 'undefined') {
  // Мониторинг жизненного цикла страницы
  window.addEventListener('beforeunload', (e) => {
    console.log('🚨 [PULL-TO-REFRESH DEBUG] beforeunload triggered');
    const currentUser = localStorage.getItem('tradeframe_user') || localStorage.getItem('currentUser');
    const authToken = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
    console.log('🚨 [PULL-TO-REFRESH DEBUG] Auth data before unload:', {
      hasUser: !!currentUser,
      hasToken: !!authToken
    });
  });

  window.addEventListener('unload', (e) => {
    console.log('🚨 [PULL-TO-REFRESH DEBUG] unload triggered');
  });

  window.addEventListener('pagehide', (e) => {
    console.log('🚨 [PULL-TO-REFRESH DEBUG] pagehide triggered, persisted:', e.persisted);
  });

  window.addEventListener('pageshow', (e) => {
    console.log('🚨 [PULL-TO-REFRESH DEBUG] pageshow triggered, persisted:', e.persisted);
    if (e.persisted) {
      // Страница восстановлена из bfcache
      console.log('🚨 [PULL-TO-REFRESH DEBUG] Page restored from bfcache');
      const currentUser = localStorage.getItem('tradeframe_user') || localStorage.getItem('currentUser');
      const authToken = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
      console.log('🚨 [PULL-TO-REFRESH DEBUG] Auth data after bfcache restore:', {
        hasUser: !!currentUser,
        hasToken: !!authToken
      });
    }
  });

  // Мониторинг изменений видимости страницы
  document.addEventListener('visibilitychange', () => {
    console.log('🚨 [PULL-TO-REFRESH DEBUG] visibilitychange:', document.visibilityState);
    if (document.visibilityState === 'visible') {
      const currentUser = localStorage.getItem('tradeframe_user') || localStorage.getItem('currentUser');
      const authToken = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
      console.log('🚨 [PULL-TO-REFRESH DEBUG] Auth data when visible:', {
        hasUser: !!currentUser,
        hasToken: !!authToken
      });
    }
  });

  // Мониторинг focus/blur
  window.addEventListener('focus', () => {
    console.log('🚨 [PULL-TO-REFRESH DEBUG] window focus');
    const currentUser = localStorage.getItem('tradeframe_user') || localStorage.getItem('currentUser');
    const authToken = localStorage.getItem('authToken') || localStorage.getItem('auth_token');
    console.log('🚨 [PULL-TO-REFRESH DEBUG] Auth data on focus:', {
      hasUser: !!currentUser,
      hasToken: !!authToken
    });
  });

  window.addEventListener('blur', () => {
    console.log('🚨 [PULL-TO-REFRESH DEBUG] window blur');
  });
}

// Убираем fallback loading индикатор когда React загрузился
console.log('📱 Creating React root...');
window.updateLoadingStatus?.('Создание React root');

try {
  const rootElement = document.getElementById("root")!;
  console.log('📱 Root element found:', !!rootElement);
  window.updateLoadingStatus?.('Root элемент найден');
  
  if (rootElement.innerHTML.includes('app-loading')) {
    console.log('🎯 Clearing fallback loading indicator');
    window.updateLoadingStatus?.('Очистка loading индикатора');
  }

  console.log('📱 Creating React root instance...');
  window.updateLoadingStatus?.('Инициализация React');
  
  const root = createRoot(rootElement);
  console.log('📱 React root created, rendering App...');
  window.updateLoadingStatus?.('Рендеринг приложения');
  
  root.render(<App />);
  console.log('📱 App rendered successfully!');
  window.updateLoadingStatus?.('✅ Приложение загружено');
  
  // Убираем loading через небольшую задержку
  setTimeout(() => {
    const loadingEl = document.getElementById('app-loading');
    if (loadingEl) {
      loadingEl.remove();
    }
  }, 500);
  
} catch (error) {
  console.error('❌ React rendering failed:', error);
  window.updateLoadingStatus?.(`❌ Ошибка: ${error.message}`);
  
  // Показываем ошибку пользователю
  const debugEl = document.getElementById('debug-info');
  if (debugEl) {
    debugEl.innerHTML += `<br><strong style="color: #ef4444;">ОШИБКА: ${error.message}</strong>`;
  }
}
