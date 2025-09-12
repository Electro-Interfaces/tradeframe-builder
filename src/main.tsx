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

createRoot(document.getElementById("root")!).render(<App />);
