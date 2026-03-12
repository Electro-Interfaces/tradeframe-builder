const AUTH_LOCAL_STORAGE_KEYS = [
  'tradeframe_user_v2',
  'tradeframe_token_v2',
  'tradeframe_user',
  'tradeframe_session',
  'authToken',
  'currentUser',
  'auth_token',
  'auth_token_expiry',
  'auth_user',
  'auth_login',
] as const;

const AUTH_SESSION_STORAGE_KEYS = [
  'auth_token',
  'auth_token_expiry',
  'auth_user',
  'current_user_email',
  'auth_timestamp',
] as const;

const APP_LOCAL_STORAGE_KEYS = [
  'FORCE_HTTP_API',
  'sts-api-config',
  'sts-test-system',
  'sts-test-station',
  'pwa-install-dismissed',
  'safari-pwa-install-dismissed',
] as const;

const APP_SESSION_STORAGE_KEYS = [
  'redirectPath',
  'lastChunkErrorReload',
  'pwa-auth-backup',
  'loginFormState',
] as const;

const APP_LOCAL_STORAGE_PREFIXES = [
  'tradeframe_',
  'tc:',
  'tf:',
  'appSidebar_',
] as const;

function removeKeys(storage: Storage, keys: readonly string[]) {
  keys.forEach((key) => storage.removeItem(key));
}

function removeByPrefixes(storage: Storage, prefixes: readonly string[]) {
  const keysToRemove: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && prefixes.some((prefix) => key.startsWith(prefix))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key));
}

export function clearTradeFrameAuthStorage() {
  removeKeys(localStorage, AUTH_LOCAL_STORAGE_KEYS);
  removeKeys(sessionStorage, AUTH_SESSION_STORAGE_KEYS);
}

export function clearTradeFrameAppStorage() {
  clearTradeFrameAuthStorage();
  removeKeys(localStorage, APP_LOCAL_STORAGE_KEYS);
  removeKeys(sessionStorage, APP_SESSION_STORAGE_KEYS);
  removeByPrefixes(localStorage, APP_LOCAL_STORAGE_PREFIXES);
}
