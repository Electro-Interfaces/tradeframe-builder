import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/mobile.css'

// Импортируем тестировщик auth системы для автоматического запуска
// import './utils/authTestRunner' // Временно отключен
// Импортируем утилиту для отчетов о localStorage
import './utils/localStorageReport'

// Регистрация Service Worker для PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
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
      });
  });
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
    
    // Если пользователь пытается скроллить вверх когда уже наверху
    if (scrollTop === 0 && currentY > startY) {
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
const rootElement = document.getElementById("root")!;
if (rootElement.innerHTML.includes('app-loading')) {
  console.log('🎯 Clearing fallback loading indicator');
}

createRoot(rootElement).render(<App />);
