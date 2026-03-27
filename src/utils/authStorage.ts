/**
 * Единый модуль хранения auth-данных.
 * ВСЕ сервисы читают/пишут токены ТОЛЬКО через этот модуль.
 */

// ─── Канонические ключи ────────────────────────────────

export const AUTH_KEYS = {
  TOKEN: 'auth_token',
  USER: 'auth_user',
  EXPIRY: 'auth_token_expiry',
  LOGIN: 'auth_login',
  SESSION_EMAIL: 'current_user_email',
  SESSION_TS: 'auth_timestamp',
} as const;

export const AUTH_STATE_CHANGED_EVENT = 'tradeframe:auth-state-changed';

// Legacy ключи — удаляются при миграции и logout
const LEGACY_KEYS = [
  'tradeframe_token_v2',
  'tradeframe_user',
  'tradeframe_user_v2',
  'authToken',
  'currentUser',
  'tradeframe_session',
  'tradeframe_users',
  'tradeframe_sessions',
  'tradeframe_audit',
  'sts-api-config',
];

// ─── Миграция legacy ключей (одноразово) ───────────────

let migrated = false;

function emitAuthStateChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AUTH_STATE_CHANGED_EVENT));
}

function migrateLegacyKeys(): void {
  if (migrated) return;
  migrated = true;

  try {
    // Перенести токен из legacy → канонический
    if (!localStorage.getItem(AUTH_KEYS.TOKEN)) {
      const legacyToken =
        localStorage.getItem('tradeframe_token_v2') ||
        localStorage.getItem('authToken') ||
        sessionStorage.getItem('auth_token');
      if (legacyToken) {
        localStorage.setItem(AUTH_KEYS.TOKEN, legacyToken);
      }
    }

    // Перенести user из legacy → канонический
    if (!localStorage.getItem(AUTH_KEYS.USER)) {
      const legacyUser =
        localStorage.getItem('tradeframe_user_v2') ||
        localStorage.getItem('tradeframe_user');
      if (legacyUser) {
        localStorage.setItem(AUTH_KEYS.USER, legacyUser);
      }
    }

    // Удалить все legacy ключи
    for (const key of LEGACY_KEYS) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
  } catch {
    // Storage может быть недоступен (private browsing, quota exceeded)
  }
}

// Запускаем миграцию при первом импорте модуля
migrateLegacyKeys();

// ─── Чтение ────────────────────────────────────────────

export function getToken(): string {
  return localStorage.getItem(AUTH_KEYS.TOKEN)
    || sessionStorage.getItem(AUTH_KEYS.TOKEN)
    || '';
}

export function getUser<T = any>(): T | null {
  try {
    const raw =
      localStorage.getItem(AUTH_KEYS.USER) ||
      sessionStorage.getItem(AUTH_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getExpiry(): number | null {
  const raw =
    localStorage.getItem(AUTH_KEYS.EXPIRY) ||
    sessionStorage.getItem(AUTH_KEYS.EXPIRY);
  if (!raw) return null;

  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function isTokenExpired(): boolean {
  const expiry = getExpiry();
  if (!expiry) return false; // Нет expiry — считаем токен валидным (сервер проверит)
  return Date.now() >= expiry;
}

export function getSessionEmail(): string | null {
  const email = sessionStorage.getItem(AUTH_KEYS.SESSION_EMAIL);
  const ts = sessionStorage.getItem(AUTH_KEYS.SESSION_TS);
  if (!email || !ts) return null;

  const SESSION_MAX_AGE = 8 * 60 * 60 * 1000; // 8 часов
  if (Date.now() - Number(ts) > SESSION_MAX_AGE) {
    sessionStorage.removeItem(AUTH_KEYS.SESSION_EMAIL);
    sessionStorage.removeItem(AUTH_KEYS.SESSION_TS);
    return null;
  }

  return email;
}

// ─── Запись ────────────────────────────────────────────

export function setToken(token: string, expiresAt?: string): void {
  localStorage.setItem(AUTH_KEYS.TOKEN, token);
  sessionStorage.setItem(AUTH_KEYS.TOKEN, token);
  if (expiresAt) {
    localStorage.setItem(AUTH_KEYS.EXPIRY, expiresAt);
    sessionStorage.setItem(AUTH_KEYS.EXPIRY, expiresAt);
  }
}

export function setUser(user: any): void {
  const json = JSON.stringify(user);
  localStorage.setItem(AUTH_KEYS.USER, json);
  sessionStorage.setItem(AUTH_KEYS.USER, json);
  emitAuthStateChanged();
}

export function setSessionInfo(email: string): void {
  sessionStorage.setItem(AUTH_KEYS.SESSION_EMAIL, email);
  sessionStorage.setItem(AUTH_KEYS.SESSION_TS, Date.now().toString());
}

export function setLoginEmail(email: string): void {
  localStorage.setItem(AUTH_KEYS.LOGIN, email);
}

// ─── Очистка ───────────────────────────────────────────

export function clearAll(): void {
  // Канонические ключи
  for (const key of Object.values(AUTH_KEYS)) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
  // Legacy ключи (на случай если остались)
  for (const key of LEGACY_KEYS) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
  emitAuthStateChanged();
}
