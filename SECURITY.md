# 🔒 Security Guide

## Политика безопасности TradeControl Builder v1.5.16

### 🔐 Аутентификация

#### Система пользователей
- **База данных**: Supabase PostgreSQL
- **Таблицы**: `users`, `roles`, `user_roles` (**РЕАЛЬНЫЕ данные**, не демо)
- **Схема ролей**: Иерархическая система доступа с реальными правами
- **Важно**: Торговые сети, торговые точки, пользователи и роли НИКОГДА не используют mock данные

#### Хеширование паролей
```typescript
// Алгоритм: SHA-256 + соль
const passwordHash = SHA-256(password + salt)
```

- **Соль**: Генерируется случайно для каждого пользователя
- **Fallback**: Base64 если SHA-256 недоступен
- **Хранение**: `pwd_hash` и `pwd_salt` в таблице `users`

### 🎫 Управление токенами

#### Формат токенов
```typescript
const token = `token_${btoa(JSON.stringify(payload))}_${timestamp}`
```

#### Жизненный цикл
1. **Генерация**: При успешной аутентификации
2. **Срок действия**: 1 час
3. **Хранение**: localStorage/sessionStorage
4. **Обновление**: Автоматическое при 401 ошибке
5. **Удаление**: При выходе из системы

#### Payload токена
```json
{
  "userId": "user-uuid",
  "email": "user@example.com",
  "role": "network_admin",
  "exp": 1234567890
}
```

### 🌐 API Безопасность

#### Внутренний API (Supabase)
- **Аутентификация**: Service Role Key
- **HTTPS**: Обязательно
- **Row Level Security**: Настроен в Supabase
- **Ограничения**: По ролям пользователей

#### Внешний API (STS)
- **Аутентификация**: HTTP Basic Auth
- **Учетные данные**: В переменных окружения
- **Timeout**: 10 секунд
- **Retry**: До 3 попыток

### 🔑 Управление секретами

#### Переменные окружения
```bash
# Supabase (настраивается в коде)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Внешний API STS
VITE_STS_API_URL=https://pos.autooplata.ru/tms/
VITE_STS_API_USERNAME=your-username
VITE_STS_API_PASSWORD=your-password
```

#### Безопасное хранение
- **❌ НЕ комитить** учетные данные в Git
- **✅ Использовать** `.env.local` для локальной разработки
- **✅ Настроить** переменные окружения на сервере
- **✅ Ротация** паролей при необходимости

### 🛡️ Защита от атак

#### CSRF Protection
- **Idempotency-Key**: Для мутирующих запросов
- **SameSite cookies**: При использовании
- **Origin validation**: В критических операциях

#### XSS Protection
- **Sanitization**: Входящих данных
- **Content Security Policy**: Рекомендуется настроить
- **HTTPOnly cookies**: Для сессий

#### Rate Limiting
- **Retry logic**: С экспоненциальной задержкой
- **Connection timeout**: 10 секунд для внешних API
- **Max attempts**: 3 попытки для HTTP запросов

### 📊 Аудит и логирование

#### Логируемые события
- ✅ Успешная аутентификация
- ❌ Неудачные попытки входа
- 🔄 Обновление токенов
- 🌐 API запросы (в dev режиме)
- ⚠️ Ошибки безопасности

#### Уровни логирования
```typescript
console.log('🔍 Search:', searchQuery);    // Поиск
console.log('✅ Success:', result);         // Успех
console.error('❌ Error:', error);          // Ошибка
console.log('🔄 Refresh:', tokenInfo);     // Обновление
```

### 🏗️ Архитектура безопасности

#### Принципы
1. **Defense in Depth**: Многоуровневая защита
2. **Least Privilege**: Минимальные права доступа
3. **Zero Trust**: Проверка каждого запроса
4. **Fail Secure**: Безопасное поведение при ошибках

#### Компоненты
```
Frontend (React) → httpClients.ts → API Services
                ↓
            localStorage/sessionStorage (токены)
                ↓
            Supabase (аутентификация)
                ↓
            External APIs (данные)
```

### 🚨 Реагирование на инциденты

#### При компрометации токенов
1. Очистить localStorage/sessionStorage
2. Принудительный re-login пользователей
3. Ротация API ключей
4. Анализ логов доступа

#### При компрометации API ключей
1. Обновить переменные окружения
2. Пересоздать ключи в Supabase
3. Уведомить администраторов
4. Проверить активные сессии

### ✅ Контрольный список безопасности

#### Development
- [ ] Учетные данные в `.env.local`
- [ ] HTTPS для всех API
- [ ] Валидация входящих данных
- [ ] Логирование критических операций

#### Production
- [ ] Переменные окружения настроены
- [ ] SSL сертификаты актуальны
- [ ] Row Level Security активен
- [ ] Мониторинг безопасности настроен
- [ ] Резервное копирование БД
- [ ] План реагирования на инциденты

### 🔧 Инструменты диагностики

#### Проверка токенов
```javascript
// В dev консоли браузера
const token = localStorage.getItem('auth_token');
const payload = JSON.parse(atob(token.split('_')[1]));
console.log('Token payload:', payload);
```

#### Тестирование подключений
```javascript
// Проверка всех API подключений
window.apiConfigService.testAllConnections();
```

#### Аудит ролей пользователя
```javascript
// Информация о текущем пользователе
const user = JSON.parse(localStorage.getItem('auth_user'));
console.log('User roles:', user);
```