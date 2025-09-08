import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Импортируем тестировщик auth системы для автоматического запуска
// import './utils/authTestRunner' // Временно отключено для исправления селекторов
// Импортируем утилиту для отчетов о localStorage
import './utils/localStorageReport'

// 🔄 Автоматический мониторинг токенов
import { tokenRefreshService } from './services/tokenRefreshService';

// ❌ ДЕМО ФУНКЦИИ ЗАБЛОКИРОВАНЫ ИЗ СООБРАЖЕНИЙ БЕЗОПАСНОСТИ
// ❌ Глобальная функция resetDemoData может полностью очистить localStorage
// ✅ Используйте отдельные административные панели для управления данными
declare global {
  interface Window {
    // resetDemoData функция удалена для безопасности производственной среды
  }
}

// window.resetDemoData заблокирована
console.log('🛡️ Демо функции отключены в целях безопасности');

// 🔄 Запуск автоматического мониторинга токенов (каждые 10 минут)
setTimeout(() => {
  tokenRefreshService.startTokenMonitoring(10);
  console.log('🔄 Автоматический мониторинг токенов запущен');
}, 5000); // Запускаем через 5 секунд после загрузки приложения

createRoot(document.getElementById("root")!).render(<App />);
