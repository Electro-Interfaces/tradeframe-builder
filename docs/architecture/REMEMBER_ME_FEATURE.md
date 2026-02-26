# Функция "Запомнить меня" для PWA

## 📋 Обзор

Реализована функция "Запомнить меня" для решения проблемы постоянного запроса логина и пароля в мобильной версии PWA приложения.

**Версия:** 1.5.53
**Дата:** 21 октября 2025

---

## 🎯 Решенная проблема

### Исходная проблема:
- При работе в режиме PWA на мобильных устройствах приложение постоянно требовало ввода логина и пароля
- Сессия сбрасывалась при:
  - Обновлении Service Worker
  - Закрытии/перезапуске PWA приложения
  - Очистке памяти системой (особенно на iOS)

### Причины:
1. **localStorage** может очищаться Service Worker'ом при обновлениях
2. **iOS Safari PWA** агрессивно очищает данные при нехватке памяти
3. Отсутствие механизма долгосрочного хранения учетных данных

---

## ✨ Реализованное решение

### Архитектура:

```
┌─────────────────────────────────────────────────┐
│         LoginPageWithLegal.tsx                  │
│  - Чекбокс "Запомнить меня"                     │
│  - Передает rememberMe в login()                │
└──────────────────┬──────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────┐
│         NewAuthContext.tsx                      │
│  - login(email, password, rememberMe)           │
│  - Сохраняет в IndexedDB при rememberMe=true    │
│  - Автовход при инициализации                   │
└──────────────────┬──────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────┐
│       src/utils/secureStorage.ts                │
│  - IndexedDB для надежного хранения             │
│  - Шифрование XOR + base64                      │
│  - Срок действия: 30 дней                       │
└─────────────────────────────────────────────────┘
```

---

## 📁 Измененные файлы

### 1. **src/utils/secureStorage.ts** (НОВЫЙ)
Утилита для работы с IndexedDB и шифрованием:

**Функции:**
- `saveRememberedCredentials(email, password, expiresInDays)` - сохраняет учетные данные
- `getRememberedCredentials()` - загружает сохраненные данные
- `clearRememberedCredentials()` - удаляет сохраненные данные
- `hasRememberedCredentials()` - проверяет наличие данных

**Особенности:**
- Использует **IndexedDB** (более надежен чем localStorage в PWA)
- **Простое шифрование XOR** + base64 (не криптографически стойкое, но достаточное для базовой защиты)
- Ключ шифрования генерируется на основе характеристик устройства
- **Автоматическое истечение срока** - данные удаляются через 30 дней

### 2. **src/contexts/NewAuthContext.tsx**
Обновлен главный контекст авторизации:

**Изменения:**
- `login(email, password, rememberMe?)` - добавлен параметр `rememberMe`
- При `rememberMe=true` сохраняет в IndexedDB
- `useEffect initializeAuth()` - проверяет IndexedDB при запуске
- Автоматический вход если найдены сохраненные данные
- `clearAuthData()` - также очищает IndexedDB

### 3. **src/pages/LoginPageWithLegal.tsx**
Обновлена страница логина:

**Изменения:**
- Чекбокс "Запомнить меня" (уже существовал, state `rememberMe`)
- Передача `rememberMe` в `login(email, password, rememberMe)`
- Удалена старая логика сохранения только email в localStorage

---

## 🔐 Безопасность

### Шифрование:
- **Метод:** XOR cipher + base64 encoding
- **Ключ:** Генерируется из характеристик устройства (userAgent, platform, screen resolution)
- **⚠️ ВАЖНО:** Это НЕ криптографически стойкое шифрование!

### Рекомендации для production:
```typescript
// Улучшенное шифрование с Web Crypto API
async function strongEncrypt(text: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key.padEnd(32, '0')),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );

  return btoa(String.fromCharCode(...iv, ...new Uint8Array(encrypted)));
}
```

---

## 🔄 Как это работает

### 1. **Вход с "Запомнить меня":**

```typescript
// Пользователь вводит логин, пароль и ставит галочку
await login('user@example.com', 'password123', true);

// ↓ NewAuthContext.login()
// 1. Аутентификация через authService
// 2. Сохранение в localStorage (текущая сессия)
// 3. Если rememberMe=true:
await saveRememberedCredentials(email, password, 30); // 30 дней
// IndexedDB: TradeFrameSecureStorage → credentials → remembered_credentials
```

### 2. **Автоматический вход при запуске PWA:**

```typescript
// useEffect initializeAuth() в NewAuthContext
1. Проверка sessionStorage (8 часов) → если есть, восстановить
2. Если нет → проверка IndexedDB:
   const rememberedCreds = await getRememberedCredentials();
3. Если найдено → автоматический вход:
   await login(rememberedCreds.email, rememberedCreds.password, true);
```

### 3. **Выход:**

```typescript
await logout();
// Очищает:
// - localStorage
// - sessionStorage
// - IndexedDB (clearRememberedCredentials)
```

---

## 📊 Преимущества IndexedDB vs localStorage

| Характеристика | localStorage | IndexedDB |
|----------------|--------------|-----------|
| **Service Worker updates** | ❌ Может очищаться | ✅ Сохраняется |
| **iOS Safari PWA** | ❌ Агрессивная очистка | ✅ Более устойчив |
| **Объем данных** | ~5-10MB | ~50MB+ |
| **Производительность** | Синхронный | Асинхронный |
| **Типы данных** | Только строки | Объекты, Blob, File |

---

## 🧪 Тестирование

### Локальное тестирование:

```bash
# 1. Запустить серверы
cd server && node index.js  # Terminal 1
npm run dev                  # Terminal 2

# 2. Открыть http://127.0.0.1:3000
# 3. Войти с галочкой "Запомнить меня"
# 4. DevTools → Application → IndexedDB → TradeFrameSecureStorage
# 5. Перезагрузить страницу → должен автоматически войти
```

### Тестирование в PWA:

```bash
# 1. Собрать production версию
npm run build

# 2. Задеплоить на TEST
git add .
git commit -m "feat: добавлена функция 'Запомнить меня' для PWA"
git push test main

# 3. Открыть на мобильном:
https://electro-interfaces.github.io/tradeframe-builder/

# 4. Установить PWA
# 5. Войти с "Запомнить меня"
# 6. Закрыть и открыть PWA → должен автоматически войти
```

### Проверка DevTools:

**Chrome DevTools → Application:**
- **IndexedDB** → TradeFrameSecureStorage → credentials
- Должна быть запись `remembered_credentials` с:
  - `email`: "user@example.com"
  - `encryptedPassword`: "base64_encrypted_string"
  - `timestamp`: 1729507200000
  - `expiresIn`: 30

---

## ⚠️ Известные ограничения

### 1. **iOS Safari PWA**
- Может все равно очищать IndexedDB при нехватке памяти
- Рекомендация: уменьшить срок до 7 дней для iOS

### 2. **Безопасность**
- Простое XOR шифрование легко взломать
- Для production рекомендуется Web Crypto API (AES-GCM)

### 3. **Приватный режим браузера**
- IndexedDB недоступен в приватном режиме
- Функция автоматически отключается

---

## 🚀 Рекомендации для production

### 1. **Улучшенная безопасность:**
```typescript
// Использовать Web Crypto API для AES-GCM шифрования
// Хранить ключ шифрования в безопасном месте
// Добавить PBKDF2 для генерации ключа из пароля пользователя
```

### 2. **Refresh Token система:**
```typescript
// Backend генерирует долгосрочный refresh token
// Frontend сохраняет refresh token в IndexedDB
// При запуске PWA автоматически обновляет access token
// Пароль НЕ хранится, только refresh token
```

### 3. **Биометрическая аутентификация:**
```typescript
// Web Authentication API (WebAuthn)
// Touch ID, Face ID, отпечаток пальца
// Безопаснее хранения паролей
```

---

## 📝 Changelog

### v1.5.53 (21.10.2025)
- ✅ Создана утилита `src/utils/secureStorage.ts`
- ✅ Обновлен `NewAuthContext` с поддержкой IndexedDB
- ✅ Добавлен параметр `rememberMe` в `login()`
- ✅ Автоматический вход при запуске PWA
- ✅ Очистка IndexedDB при logout
- ✅ Срок хранения: 30 дней
- ✅ Простое XOR шифрование

---

## 🔗 Связанные файлы

- `src/utils/secureStorage.ts` - Утилита IndexedDB
- `src/contexts/NewAuthContext.tsx` - Главный контекст авторизации
- `src/pages/LoginPageWithLegal.tsx` - Страница логина
- `src/config/version.ts` - Версия 1.5.53
- `CLAUDE.md` - Инструкции для разработки

---

## 💡 Примеры использования

### Проверка наличия сохраненных данных:
```typescript
import { hasRememberedCredentials } from '@/utils/secureStorage';

const hasSavedCreds = await hasRememberedCredentials();
if (hasSavedCreds) {
  console.log('Пользователь может автоматически войти');
}
```

### Ручная очистка:
```typescript
import { clearRememberedCredentials } from '@/utils/secureStorage';

// При смене пользователя
await clearRememberedCredentials();
```

### Продление срока:
```typescript
import { refreshRememberedCredentials } from '@/utils/secureStorage';

// Продлить на еще 30 дней
await refreshRememberedCredentials(30);
```
