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

createRoot(document.getElementById("root")!).render(<App />);
