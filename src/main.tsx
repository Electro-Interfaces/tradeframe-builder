import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/mobile.css'

// Простая регистрация Service Worker для PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const base = import.meta.env.BASE_URL;
  navigator.serviceWorker.register(`${base}sw.js`, { scope: base })
    .catch(() => {}); // Игнорируем ошибки - не критично
}

// Глобальная функция для сброса демо данных
declare global {
  interface Window {
    resetDemoData: () => void;
    reactReady?: boolean;
  }
}

window.resetDemoData = () => {
  localStorage.clear();
  location.reload();
};

// Минимальная детекция для необходимых фиксов
if (typeof window !== 'undefined') {
  const userAgent = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isWebView = /wv|WebView|Version.*Chrome/i.test(userAgent) && isMobile;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone;

  // Применяем только необходимые классы без логирования
  if (isWebView) document.documentElement.classList.add('webview-optimized');
  if (isStandalone) {
    document.documentElement.classList.add('pwa-installed');

    // iOS PWA auth fix
    const authFromBrowser = sessionStorage.getItem('pwa-auth-backup');
    if (authFromBrowser && !localStorage.getItem('tradeframe_user')) {
      try {
        const authData = JSON.parse(authFromBrowser);
        localStorage.setItem('tradeframe_user', authData.user);
        localStorage.setItem('authToken', authData.token);
      } catch (e) {}
    }

    // iOS PWA error prevention и обработка DOM ошибок
    window.addEventListener('error', (e) => {
      // Специальная обработка DOM ошибок типа insertBefore
      if (e.message && (
        e.message.includes('insertBefore') ||
        e.message.includes('appendChild') ||
        e.message.includes('removeChild') ||
        e.message.includes('Node')
      )) {
        console.warn('⚠️ DOM error intercepted:', e.message);
        e.preventDefault();
        return true;
      }

      // Общая обработка для PWA
      e.preventDefault();
      return true;
    });

    // Дополнительная защита для unhandledrejection (для React ошибок)
    window.addEventListener('unhandledrejection', (e) => {
      if (e.reason && e.reason.message && (
        e.reason.message.includes('insertBefore') ||
        e.reason.message.includes('appendChild') ||
        e.reason.message.includes('removeChild') ||
        e.reason.message.includes('Node')
      )) {
        console.warn('⚠️ React DOM error intercepted:', e.reason.message);
        e.preventDefault();
        return true;
      }
    });

    // Перехват ошибок React на более низком уровне
    if (typeof Node !== 'undefined' && Node.prototype.insertBefore) {
      const originalInsertBefore = Node.prototype.insertBefore;
      Node.prototype.insertBefore = function(newNode, referenceNode) {
        try {
          // Проверяем что referenceNode действительно дочерний элемент
          if (referenceNode && referenceNode.parentNode !== this) {
            console.warn('⚠️ insertBefore: referenceNode is not a child, appending instead');
            return this.appendChild(newNode);
          }
          return originalInsertBefore.call(this, newNode, referenceNode);
        } catch (error) {
          console.warn('⚠️ insertBefore error caught, falling back to appendChild:', error.message);
          try {
            return this.appendChild(newNode);
          } catch (appendError) {
            console.warn('⚠️ appendChild also failed:', appendError.message);
            return newNode;
          }
        }
      };
    }
  }
}

// GitHub Pages routing - обработается в App.tsx

// Pull-to-refresh protection
if (typeof window !== 'undefined') {
  let startY = 0;

  document.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    const currentY = e.touches[0].clientY;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const target = e.target as Element;
    const isInSidebar = target.closest('[role="dialog"]') ||
                       target.closest('.mobile-sidebar') ||
                       target.closest('[data-radix-dialog-content]') ||
                       target.closest('.overflow-y-scroll');

    if (scrollTop === 0 && currentY > startY && !isInSidebar) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, { passive: false });
}

// React root creation
try {
  const root = createRoot(document.getElementById("root")!);

  // Global error handling
  window.addEventListener('error', (e) => e.preventDefault());
  window.addEventListener('unhandledrejection', (e) => e.preventDefault());

  root.render(<App />);

  // Clean loading indicator
  setTimeout(() => {
    window.reactReady = true;
    const loadingEl = document.getElementById('initial-loading');
    if (loadingEl) {
      loadingEl.style.opacity = '0';
      setTimeout(() => loadingEl.remove(), 200);
    }
  }, 50);
  
} catch (error) {
  console.error('React rendering failed:', error);
}
