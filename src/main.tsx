import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Импортируем тестировщик auth системы для автоматического запуска
import './utils/authTestRunner'
// Импортируем утилиту для отчетов о localStorage
import './utils/localStorageReport'

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
