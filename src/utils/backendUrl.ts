/**
 * Определение URL бэкенда по текущему окружению.
 * Единая точка для всех proxy-клиентов.
 *
 * Логика:
 * - SSR / отсутствие window → localhost:3001
 * - GitHub Pages → env VITE_FALLBACK_BACKEND_URL или testtf.dataworker.ru
 * - Остальные (prod, test, local) → window.location.origin
 */

const FALLBACK_BACKEND_URL = import.meta.env.VITE_FALLBACK_BACKEND_URL || 'https://testtf.dataworker.ru';

export function getBackendOrigin(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:3001';
  }

  const origin = window.location?.origin;

  if (!origin || origin === 'null' || origin === 'undefined') {
    return 'http://localhost:3001';
  }

  // GitHub Pages — статический хостинг, нет собственного backend
  if (origin.includes('github.io')) {
    return FALLBACK_BACKEND_URL;
  }

  return origin;
}
