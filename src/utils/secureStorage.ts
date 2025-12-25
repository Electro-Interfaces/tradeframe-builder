/**
 * Безопасное хранилище для PWA
 * Использует IndexedDB для надежного хранения зашифрованных данных
 * Поддерживает "Запомнить меня" функционал
 */

import { utf8ToBase64, base64ToUtf8 } from './base64';

// Константы для IndexedDB
const DB_NAME = 'TradeFrameSecureStorage';
const DB_VERSION = 1;
const STORE_NAME = 'credentials';
const CREDENTIALS_KEY = 'remembered_credentials';

// Интерфейс сохраняемых учетных данных
interface StoredCredentials {
  email: string;
  encryptedPassword: string;
  timestamp: number;
  expiresIn: number; // в днях
}

/**
 * Открывает соединение с IndexedDB
 */
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Простое шифрование пароля (XOR с ключом)
 * Примечание: Это НЕ криптографически стойкое шифрование!
 * Для production лучше использовать Web Crypto API
 */
function simpleEncrypt(text: string, key: string): string {
  let encrypted = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    encrypted += String.fromCharCode(charCode);
  }
  return utf8ToBase64(encrypted); // Безопасное base64 кодирование с поддержкой Unicode
}

/**
 * Простая расшифровка пароля
 */
function simpleDecrypt(encrypted: string, key: string): string {
  const decoded = base64ToUtf8(encrypted); // Безопасное base64 декодирование с поддержкой Unicode
  let decrypted = '';
  for (let i = 0; i < decoded.length; i++) {
    const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    decrypted += String.fromCharCode(charCode);
  }
  return decrypted;
}

/**
 * Генерирует ключ шифрования на основе характеристик устройства
 */
function getDeviceKey(): string {
  const userAgent = navigator.userAgent;
  const language = navigator.language;
  const platform = navigator.platform;
  const screenResolution = `${screen.width}x${screen.height}`;

  // Используем безопасное base64 кодирование для поддержки Unicode символов
  return utf8ToBase64(`${userAgent}-${language}-${platform}-${screenResolution}`).substring(0, 32);
}

/**
 * Сохраняет учетные данные в IndexedDB
 */
export async function saveRememberedCredentials(
  email: string,
  password: string,
  expiresInDays: number = 30
): Promise<void> {
  try {
    const db = await openDB();
    const deviceKey = getDeviceKey();
    const encryptedPassword = simpleEncrypt(password, deviceKey);

    const credentials: StoredCredentials = {
      email,
      encryptedPassword,
      timestamp: Date.now(),
      expiresIn: expiresInDays,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(credentials, CREDENTIALS_KEY);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    throw new Error('Не удалось сохранить учетные данные');
  }
}

/**
 * Загружает сохраненные учетные данные из IndexedDB
 */
export async function getRememberedCredentials(): Promise<{ email: string; password: string } | null> {
  try {
    const db = await openDB();

    const credentials: StoredCredentials | undefined = await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(CREDENTIALS_KEY);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!credentials) {
      return null;
    }

    // Проверяем не истек ли срок действия
    const expirationTime = credentials.timestamp + credentials.expiresIn * 24 * 60 * 60 * 1000;
    if (Date.now() > expirationTime) {
      // Истек срок - удаляем
      await clearRememberedCredentials();
      return null;
    }

    // Расшифровываем пароль
    const deviceKey = getDeviceKey();
    const password = simpleDecrypt(credentials.encryptedPassword, deviceKey);

    return {
      email: credentials.email,
      password,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Удаляет сохраненные учетные данные
 */
export async function clearRememberedCredentials(): Promise<void> {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(CREDENTIALS_KEY);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    // Игнорируем ошибки при удалении
  }
}

/**
 * Проверяет наличие сохраненных учетных данных
 */
export async function hasRememberedCredentials(): Promise<boolean> {
  try {
    const credentials = await getRememberedCredentials();
    return credentials !== null;
  } catch {
    return false;
  }
}

/**
 * Обновляет срок действия сохраненных учетных данных
 */
export async function refreshRememberedCredentials(expiresInDays: number = 30): Promise<void> {
  try {
    const credentials = await getRememberedCredentials();
    if (credentials) {
      await saveRememberedCredentials(credentials.email, credentials.password, expiresInDays);
    }
  } catch (error) {
    // Игнорируем ошибки
  }
}
