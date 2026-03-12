import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/mobile.css'
import { clearTradeFrameAppStorage } from './utils/storageCleanup'

const DOM_MUTATION_ERROR_PATTERNS = ['insertBefore', 'appendChild', 'removeChild'] as const

function getErrorMessage(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (value && typeof value === 'object' && 'message' in value) {
    const message = (value as { message?: unknown }).message
    return typeof message === 'string' ? message : ''
  }

  return ''
}

function isRecoverableDomMutationError(value: unknown): boolean {
  const message = getErrorMessage(value)
  return DOM_MUTATION_ERROR_PATTERNS.some((pattern) => message.includes(pattern))
}

// Регистрация Service Worker для PWA (единственная точка регистрации)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // Регистрируем после загрузки страницы для лучшей производительности
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL;

    navigator.serviceWorker.register(`${base}sw.js`, { scope: base })
      .then((registration) => {
        // Проверяем обновления каждые 60 секунд
        setInterval(() => {
          registration.update().catch(() => {});
        }, 60000);

        // Обработка нового SW
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              // SW активирован - можно использовать кэш
              if (newWorker.state === 'activated') {
                // Уведомляем о готовности PWA
                window.dispatchEvent(new CustomEvent('sw-ready'));
              }
            });
          }
        });
      })
      .catch(() => {}); // Игнорируем ошибки - не критично для работы приложения

    // Обработка обновления SW (перезагрузка при смене контроллера)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

// Глобальная функция для сброса демо данных
declare global {
  interface Window {
    resetDemoData: () => void;
    clearTradeFrameAppStorage: () => void;
    reactReady?: boolean;
  }
}

window.clearTradeFrameAppStorage = clearTradeFrameAppStorage;

window.resetDemoData = () => {
  clearTradeFrameAppStorage();
  location.reload();
};

// Глобальный патч insertBefore для предотвращения ошибок React
// Применяется всегда, не только в PWA режиме
if (typeof window !== 'undefined' && typeof Node !== 'undefined' && Node.prototype.insertBefore) {
  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function(newNode, referenceNode) {
    try {
      // Проверяем что referenceNode действительно дочерний элемент
      if (referenceNode && referenceNode.parentNode !== this) {
        return this.appendChild(newNode);
      }
      return originalInsertBefore.call(this, newNode, referenceNode);
    } catch (error) {
      try {
        return this.appendChild(newNode);
      } catch (appendError) {
        return newNode;
      }
    }
  };
}

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
    if (authFromBrowser && !localStorage.getItem('tradeframe_user_v2') && !localStorage.getItem('tradeframe_user')) {
      try {
        const authData = JSON.parse(authFromBrowser);
        localStorage.setItem('tradeframe_user_v2', authData.user);
        localStorage.setItem('tradeframe_token_v2', authData.token);
        localStorage.setItem('tradeframe_user', authData.user);
        localStorage.setItem('authToken', authData.token);
        localStorage.setItem('auth_token', authData.token);
        localStorage.setItem('auth_user', authData.user);
        sessionStorage.setItem('auth_token', authData.token);
        sessionStorage.setItem('auth_user', authData.user);
      } catch (e) {
        void e;
      }
    }
  }
}

// GitHub Pages routing - обработается в App.tsx

// Pull-to-refresh protection — реализовано через CSS overscroll-behavior-y: contain
// в index.html и mobile.css (не требует JS-блокировки touchmove)

// Глобальная обработка ошибок insertBefore для всех браузеров
window.addEventListener('error', (e) => {
  // Предотвращаем показ ошибки insertBefore пользователю
  if (isRecoverableDomMutationError(e.message)) {
    e.preventDefault();
    return true;
  }
});

window.addEventListener('unhandledrejection', (e) => {
  // Предотвращаем показ ошибки insertBefore в промисах
  if (isRecoverableDomMutationError(e.reason)) {
    e.preventDefault();
    return true;
  }
});

// React root creation
try {
  const root = createRoot(document.getElementById("root")!);

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
  // Показываем пользователю сообщение об ошибке
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: hsl(var(--background)); color: hsl(var(--foreground)); font-family: system-ui;">
        <div style="text-align: center; padding: 20px;">
          <h1 style="margin-bottom: 20px;">Ошибка загрузки</h1>
          <p style="margin-bottom: 20px; color: hsl(var(--muted-foreground));">Приложение не может быть загружено</p>
          <button
            onclick="window.clearTradeFrameAppStorage(); location.reload();"
            style="background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px;">
            Очистить данные и перезагрузить
          </button>
        </div>
      </div>
    `;
  }
}
