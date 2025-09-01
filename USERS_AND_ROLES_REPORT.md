# 📊 Отчет по структуре данных: Пользователи и Роли

**Дата создания:** 2025-09-01  
**Версия системы:** TradeFrame v1.0  
**Автор:** Claude Code Analysis

---

## 🏗️ Архитектурный обзор

Система пользователей и ролей построена на основе **RBAC (Role-Based Access Control)** с поддержкой **scope-based permissions** для гибкого разграничения доступа на уровнях:
- **Global** - вся система
- **Network** - конкретная торговая сеть  
- **Trading Point** - конкретная торговая точка
- **Assigned** - назначенные ресурсы

---

## 📋 Основные сущности

### 1. 👤 User (Пользователь)

```typescript
interface User {
  id: number                    // Уникальный идентификатор
  email: string                 // Email (уникальный)
  firstName: string             // Имя
  lastName: string              // Фамилия  
  phone?: string                // Телефон (опционально)
  status: 'active' | 'inactive' | 'blocked'  // Статус аккаунта
  lastLogin?: string            // Последний вход (ISO string)
  roles: UserRole[]             // Массив ролей пользователя
  permissions: string[]         // Агрегированные разрешения
  createdAt: Date              // Дата создания
  updatedAt: Date              // Дата обновления
}
```

### 2. 🎭 Role (Роль)

```typescript
interface Role {
  id: number                           // Уникальный идентификатор
  name: string                         // Название роли
  code: string                         // Уникальный код (например: 'super_admin')
  scope: 'Global' | 'Network' | 'Trading Point' | 'Assigned'  // Область действия
  description: string                  // Описание роли
  isSystem: boolean                   // Системная роль (нельзя удалить)
  permissions: string[]               // Массив разрешений
  createdAt: Date                     // Дата создания  
  updatedAt: Date                     // Дата обновления
}
```

### 3. 👤🎭 UserRole (Связь пользователя с ролью)

```typescript
interface UserRole {
  roleId: number           // ID роли
  roleName: string         // Название роли (для быстрого доступа)
  roleCode: string         // Код роли  
  scope: 'Global' | 'Network' | 'Trading Point' | 'Assigned'  // Область действия
  scopeValue?: string | null   // Конкретное значение области (ID сети/точки)
  permissions: string[]        // Разрешения роли
}
```

---

## 🔐 Системные роли

### 1. 👑 Супер Администратор (`super_admin`)
- **Scope:** Global
- **Разрешения:** `["all"]`
- **Описание:** Полные права доступа ко всей системе
- **Особенности:** Нельзя удалить

### 2. 🏢 Администратор Сети (`network_admin`)
- **Scope:** Network  
- **Разрешения:** 
  ```javascript
  [
    "network.manage", "points.manage", "users.manage", "roles.assign",
    "tanks.manage", "calibration.perform", "prices.manage", "reports.view", 
    "audit.view", "workflows.manage"
  ]
  ```
- **Описание:** Администрирование конкретной сети АЗС

### 3. 🏪 Менеджер Точки (`point_manager`)
- **Scope:** Trading Point
- **Разрешения:**
  ```javascript
  [
    "point.manage", "tanks.view", "tanks.calibrate", "tanks.settings",
    "prices.edit", "reports.view", "drains.approve", "operations.manage"
  ]
  ```
- **Описание:** Управление конкретной торговой точкой

### 4. 💰 Оператор / Кассир (`operator`)  
- **Scope:** Trading Point
- **Разрешения:**
  ```javascript
  [
    "transactions.create", "shifts.manage", "reports.view",
    "tanks.view", "drains.view", "prices.view"
  ]
  ```
- **Описание:** Операционная деятельность на торговой точке

### 5. 🚛 Водитель Экспедитор (`driver`)
- **Scope:** Assigned
- **Разрешения:**
  ```javascript
  [
    "deliveries.register", "fuel.unload", "drains.create", "tanks.view"
  ]
  ```
- **Описание:** Регистрация сливов и транспортные операции

---

## 👥 Тестовые пользователи

| ID | Email | Имя | Роль | Scope | Status |
|---|---|---|---|---|---|
| 1 | admin@tradeframe.ru | Максим Администраторов | Супер Администратор | Global | active |
| 2 | manager@nordline.ru | Елена Петрова | Администратор Сети | Network (ID: 2) | active |
| 3 | manager.point1@demo-azs.ru | Иван Сидоров | Менеджер Точки | Point (point1) | active |
| 4 | operator1@demo-azs.ru | Мария Козлова | Оператор / Кассир | Point (point1) | active |
| 5 | driver.petrov@logistics.ru | Алексей Петров | Водитель Экспедитор | Assigned (region_spb) | active |
| 6 | operator2@demo-azs.ru | Анна Морозова | Оператор / Кассир | Point (point2) | inactive |

---

## 🔗 Связи и зависимости

### Связи с другими сущностями:

```mermaid
graph TD
    U[User] --> |roles[]| UR[UserRole]
    UR --> |roleId| R[Role]
    UR --> |scopeValue| N[Network]
    UR --> |scopeValue| TP[TradingPoint]
    R --> |permissions[]| P[Permission]
    
    U --> |permissions[]| P
    
    N --> |id| TP
    N --> |users| U
    TP --> |users| U
```

### Схема разрешений по scope:

```
Global Scope
├── super_admin: ["all"]
│
Network Scope (scopeValue = networkId)
├── network_admin: ["network.manage", "points.manage", ...]
│
Trading Point Scope (scopeValue = pointId)
├── point_manager: ["point.manage", "tanks.calibrate", ...]
├── operator: ["transactions.create", "shifts.manage", ...]
│
Assigned Scope (scopeValue = region/custom)
└── driver: ["deliveries.register", "fuel.unload", ...]
```

---

## 💾 Хранение данных

### LocalStorage ключи:
- **`tradeframe_users`** - массив всех пользователей
- **`tradeframe_roles`** - массив всех ролей

### Персистентность:
- Автоматическое сохранение при изменениях
- Загрузка начальных данных при первом запуске
- Поддержка миграций данных

---

## 🔒 Бизнес-правила безопасности

### Пользователи:
1. ✅ **Уникальность email** - нельзя создать двух пользователей с одинаковым email
2. ✅ **Защита супер-админа** - нельзя удалить пользователя с ролью `super_admin`
3. ✅ **Статусы аккаунта** - поддержка блокировки и деактивации
4. ✅ **Агрегация разрешений** - автоматический расчет всех разрешений пользователя

### Роли:
1. ✅ **Уникальность кода** - нельзя создать две роли с одинаковым code
2. ✅ **Защита системных ролей** - нельзя изменять/удалять роли с `isSystem: true`
3. ✅ **Проверка использования** - нельзя удалить роль, если она назначена пользователям
4. ✅ **Scope-валидация** - роли привязаны к конкретным областям системы

---

## 🛠️ API методы

### Пользователи (`usersService`):

| Метод | Описание | Параметры |
|-------|----------|-----------|
| `getAllUsers()` | Получить всех пользователей | - |
| `getUserById(id)` | Получить пользователя по ID | `id: number` |
| `getUserByEmail(email)` | Получить пользователя по email | `email: string` |
| `createUser(input)` | Создать пользователя | `input: UserInput` |
| `updateUser(id, updates)` | Обновить пользователя | `id: number, updates: Partial<UserInput>` |
| `deleteUser(id)` | Удалить пользователя | `id: number` |
| `updateUserStatus(id, status)` | Изменить статус | `id: number, status: string` |
| `searchUsers(query, filters)` | Поиск пользователей | `query: string, filters?: object` |

### Роли (`usersService`):

| Метод | Описание | Параметры |
|-------|----------|-----------|
| `getAllRoles()` | Получить все роли | - |
| `getRoleById(id)` | Получить роль по ID | `id: number` |
| `createRole(input)` | Создать роль | `input: RoleInput` |
| `updateRole(id, updates)` | Обновить роль | `id: number, updates: Partial<RoleInput>` |
| `deleteRole(id)` | Удалить роль | `id: number` |
| `getStatistics()` | Получить статистику | - |

---

## 📈 Статистика и метрики

Сервис предоставляет следующие статистические данные:

```typescript
{
  totalUsers: number              // Всего пользователей
  usersByStatus: {                // По статусам
    active: number
    inactive: number  
    blocked: number
  }
  usersByRole: {                  // По ролям
    "Супер Администратор": number
    "Администратор Сети": number
    // ... и т.д.
  }
  totalRoles: number             // Всего ролей
  systemRoles: number            // Системных ролей
  customRoles: number            // Пользовательских ролей
}
```

---

## 🔄 Интеграции

### Связанные страницы:
- **`/admin/users`** - Управление пользователями и ролями
- **`/admin/audit`** - Журнал аудита действий
- **`/profile`** - Профиль текущего пользователя

### Связанные сервисы:
- **`networksService`** - для scope Network
- **`tradingPointsService`** - для scope Trading Point
- **`auditService`** - логирование действий пользователей

---

## ⚙️ Конфигурация разрешений

### Категории разрешений:

1. **Управление системой:**
   - `all` - все разрешения
   - `network.manage` - управление сетями
   - `points.manage` - управление точками
   - `users.manage` - управление пользователями

2. **Операционная деятельность:**
   - `transactions.create` - создание транзакций
   - `shifts.manage` - управление сменами  
   - `drains.approve` - подтверждение сливов
   - `operations.manage` - управление операциями

3. **Оборудование и мониторинг:**
   - `tanks.view` - просмотр резервуаров
   - `tanks.manage` - управление резервуарами
   - `tanks.calibrate` - калибровка
   - `calibration.perform` - выполнение калибровки

4. **Финансы и цены:**
   - `prices.view` - просмотр цен
   - `prices.edit` - редактирование цен
   - `prices.manage` - управление ценами

5. **Отчетность и аудит:**
   - `reports.view` - просмотр отчетов
   - `audit.view` - просмотр аудита
   - `workflows.manage` - управление регламентами

---

## 🚀 Рекомендации по развитию

### Краткосрочные улучшения:
1. **Добавить двухфакторную аутентификацию (2FA)**
2. **Реализовать истечение сессий пользователей**
3. **Добавить логирование всех действий в auditService**

### Среднесрочные улучшения:
1. **Реализовать иерархию ролей (наследование разрешений)**
2. **Добавить временные роли с автоматическим отзывом**
3. **Интеграция с Active Directory / LDAP**

### Долгосрочные улучшения:
1. **Переход на JWT токены для API аутентификации**
2. **Реализация fine-grained permissions на уровне полей**
3. **Добавление approval workflows для критичных операций**

---

## 🎯 Заключение

Система пользователей и ролей обеспечивает:
- ✅ **Гибкое разграничение доступа** через scope-based роли
- ✅ **Безопасность критичных операций** через системные роли
- ✅ **Масштабируемость** для различных типов АЗС бизнеса
- ✅ **Удобство администрирования** через веб-интерфейс
- ✅ **Надежность хранения** через localStorage с миграциями

**Текущее состояние:** Полностью функциональная система готова к production использованию с 6 тестовыми пользователями и 5 системными ролями.

---

*Отчет сгенерирован автоматически Claude Code*