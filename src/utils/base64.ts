/**
 * Утилиты для безопасного base64 кодирования с поддержкой Unicode
 */

/**
 * Кодирует строку в base64 с поддержкой Unicode (кириллица и т.д.)
 */
export function utf8ToBase64(str: string): string {
  try {
    // Используем encodeURIComponent для преобразования Unicode в escape-последовательности
    // затем декодируем их обратно в байты для btoa
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    ));
  } catch {
    // Fallback для старых браузеров
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    bytes.forEach(byte => binary += String.fromCharCode(byte));
    return btoa(binary);
  }
}

/**
 * Декодирует base64 строку с поддержкой Unicode
 */
export function base64ToUtf8(base64: string): string {
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    // Fallback
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }
}

/**
 * Безопасно кодирует JSON объект в base64
 */
export function jsonToBase64(obj: unknown): string {
  return utf8ToBase64(JSON.stringify(obj));
}

/**
 * Безопасно декодирует base64 в JSON объект
 */
export function base64ToJson<T = unknown>(base64: string): T {
  return JSON.parse(base64ToUtf8(base64)) as T;
}
