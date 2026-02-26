/**
 * Безопасное хранилище для PWA
 * Использует IndexedDB + Web Crypto API (AES-GCM) для хранения учётных данных
 * Поддерживает "Запомнить меня" функционал
 */

// Константы для IndexedDB
const DB_NAME = 'TradeFrameSecureStorage';
const DB_VERSION = 2;
const STORE_NAME = 'credentials';
const CREDENTIALS_KEY = 'remembered_credentials';
const CRYPTO_KEY_NAME = 'encryption_key';

// Интерфейс сохраняемых учетных данных
interface StoredCredentials {
  email: string;
  encryptedPassword: string; // base64(iv + ciphertext)
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
 * Получает или создаёт AES-GCM ключ, хранит в IndexedDB
 */
async function getCryptoKey(): Promise<CryptoKey> {
  const db = await openDB();

  // Пробуем загрузить существующий ключ
  const existingKey: CryptoKey | undefined = await new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(CRYPTO_KEY_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  if (existingKey) {
    return existingKey;
  }

  // Генерируем новый AES-GCM 256-bit ключ
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // не экспортируемый
    ['encrypt', 'decrypt']
  );

  // Сохраняем в IndexedDB
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(key, CRYPTO_KEY_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  return key;
}

/**
 * Шифрует текст с помощью AES-GCM
 * Возвращает base64(12 bytes IV + ciphertext)
 */
async function encrypt(text: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // Склеиваем IV + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Кодируем в base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Расшифровывает текст из base64(IV + ciphertext)
 */
async function decrypt(encoded: string, key: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Сохраняет учетные данные в IndexedDB (AES-GCM шифрование)
 */
export async function saveRememberedCredentials(
  email: string,
  password: string,
  expiresInDays: number = 30
): Promise<void> {
  try {
    const db = await openDB();
    const key = await getCryptoKey();
    const encryptedPassword = await encrypt(password, key);

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
      await clearRememberedCredentials();
      return null;
    }

    // Расшифровываем пароль через AES-GCM
    const key = await getCryptoKey();
    const password = await decrypt(credentials.encryptedPassword, key);

    return { email: credentials.email, password };
  } catch (error) {
    // При ошибке расшифровки (например, смена ключа) — очищаем
    await clearRememberedCredentials().catch(() => {});
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
