# 🔍 ПОЛНЫЙ АУДИТ ГОТОВНОСТИ К SUPABASE МИГРАЦИИ

**Дата проведения:** 03.09.2025, 14:24:22
**Всего страниц:** 38

## 📊 СВОДНАЯ СТАТИСТИКА

- ✅ Загружаются без ошибок: **38/38** (100%)
- ❌ Имеют ошибки: **0** страниц
- 🚀 Готовы к миграции (≥70%): **16** страниц
- 🎭 Используют Mock данные: **18** страниц
- 🌐 Используют реальный API: **11** страниц

## 📂 РАЗДЕЛ ADMIN (15 страниц)

### 🟢 /admin/users-and-roles

**Компонент:** `Users`
**Файл:** `admin/Users.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 70%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**Используемые сервисы:** userService, roleService
**CRUD операции:** Create, Read, Update, Delete
**Тип данных:** Реальный API
**React Query:** Да
**Размер кода:** 285 строк

---

### 🟡 /admin/users-and-roles-new

**Компонент:** `NewUsersAndRoles`
**Файл:** `admin/UsersAndRoles.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 55%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**Используемые сервисы:** userService, roleService
**CRUD операции:** Create, Read, Update, Delete
**Тип данных:** Реальный API
**React Query:** Нет
**Размер кода:** 422 строк

---

### 🟢 /admin/users

**Компонент:** `AdminUsers`
**Файл:** `AdminUsers.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 70%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**CRUD операции:** Create, Read, Update, Delete
**Тип данных:** Mock/localStorage
**React Query:** Нет
**Размер кода:** 1242 строк

---

### 🟡 /admin/roles

**Компонент:** `Roles`
**Файл:** `admin/Roles.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 55%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**Используемые сервисы:** roleService
**CRUD операции:** Create, Read, Update, Delete
**Тип данных:** Реальный API
**React Query:** Нет
**Размер кода:** 314 строк

---

### 🟡 /admin/instructions

**Компонент:** `Instructions`
**Файл:** `admin/Instructions.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 55%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**Используемые сервисы:** instructionsService
**CRUD операции:** Create, Read, Update
**Тип данных:** Реальный API
**React Query:** Нет
**Размер кода:** 647 строк

---

### 🟡 /admin/networks

**Компонент:** `NetworksPage`
**Файл:** `NetworksPage.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 55%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**Используемые сервисы:** networksService, tradingPointsService
**CRUD операции:** Create, Read, Update, Delete
**Тип данных:** Реальный API
**React Query:** Нет
**Размер кода:** 810 строк

---

### 🟢 /admin/audit

**Компонент:** `AuditLog`
**Файл:** `AuditLog.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 70%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**CRUD операции:** Create, Read, Update
**Тип данных:** Mock/localStorage
**React Query:** Нет
**Размер кода:** 1105 строк

---

### 🟢 /admin/data-migration

**Компонент:** `DataMigration`
**Файл:** `DataMigration.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 75%
**Сложность миграции:** низкая
**Временные затраты:** 30 мин - 1 час
**CRUD операции:** Нет
**Тип данных:** Реальный API
**React Query:** Нет
**Размер кода:** 14 строк

---

### 🟢 /admin/test-services

**Компонент:** `TestServices`
**Файл:** `TestServices.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 70%
**Сложность миграции:** средняя
**Временные затраты:** 2-4 часа
**CRUD операции:** Read
**Тип данных:** Реальный API
**React Query:** Нет
**Размер кода:** 142 строк

---

### 🟢 /admin/test-simple

**Компонент:** `TestServicesSimple`
**Файл:** `TestServicesSimple.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 70%
**Сложность миграции:** средняя
**Временные затраты:** 2-4 часа
**CRUD операции:** Read
**Тип данных:** Реальный API
**React Query:** Нет
**Размер кода:** 37 строк

---

### 🟢 /admin/test-debug

**Компонент:** `TestDebug`
**Файл:** `TestDebug.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 70%
**Сложность миграции:** средняя
**Временные затраты:** 2-4 часа
**CRUD операции:** Create
**Тип данных:** Реальный API
**React Query:** Нет
**Размер кода:** 18 строк

---

### 🟢 /admin/data-inspector

**Компонент:** `DataInspector`
**Файл:** `DataInspector.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 70%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**CRUD операции:** Create, Read, Update
**Тип данных:** Mock/localStorage
**React Query:** Нет
**Размер кода:** 709 строк

---

### 🟡 /admin/legal-documents

**Компонент:** `LegalDocuments`
**Файл:** `LegalDocuments.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 55%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**Используемые сервисы:** legalDocumentsService
**CRUD операции:** Create, Read, Update
**Тип данных:** Реальный API
**React Query:** Нет
**Размер кода:** 431 строк

---

### 🟡 /admin/legal-documents/users-acceptances

**Компонент:** `LegalUsersAcceptances`
**Файл:** `LegalUsersAcceptances.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 65%
**Сложность миграции:** средняя
**Временные затраты:** 2-4 часа
**Используемые сервисы:** legalDocumentsService
**CRUD операции:** Read, Update
**Тип данных:** Реальный API
**React Query:** Нет
**Размер кода:** 396 строк

---

### 🟡 /admin/legal-documents/:docType/edit

**Компонент:** `LegalDocumentEditor`
**Файл:** `LegalDocumentEditor.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 60%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**CRUD операции:** Create, Read, Update
**Тип данных:** Реальный API
**React Query:** Нет
**Размер кода:** 525 строк

---

## 📂 РАЗДЕЛ SETTINGS (9 страниц)

### 🟡 /settings/dictionaries/equipment-types

**Компонент:** `EquipmentTypes`
**Файл:** `EquipmentTypes.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 65%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**Используемые сервисы:** equipmentTypes, systemTypesService
**CRUD операции:** Create, Read, Update, Delete
**Тип данных:** Mock/localStorage
**React Query:** Нет
**Размер кода:** 1275 строк

---

### 🟡 /settings/dictionaries/component-types

**Компонент:** `ComponentTypes`
**Файл:** `ComponentTypes.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 55%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**Используемые сервисы:** componentTemplatesService
**CRUD операции:** Create, Read, Update, Delete
**Тип данных:** Реальный API
**React Query:** Нет
**Размер кода:** 644 строк

---

### 🟡 /settings/dictionaries/command-templates

**Компонент:** `CommandTemplates`
**Файл:** `CommandTemplates.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 65%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**Используемые сервисы:** commandTemplates
**CRUD операции:** Create, Read, Update, Delete
**Тип данных:** Mock/localStorage
**React Query:** Нет
**Размер кода:** 610 строк

---

### 🟡 /settings/templates/command-templates

**Компонент:** `NewCommandTemplates`
**Файл:** `NewCommandTemplates.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 65%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**Используемые сервисы:** newConnectionsService
**CRUD операции:** Create, Read, Update, Delete
**Тип данных:** Mock/localStorage
**React Query:** Нет
**Размер кода:** 757 строк

---

### 🟡 /settings/connections

**Компонент:** `Connections`
**Файл:** `Connections.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 65%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**Используемые сервисы:** connections
**CRUD операции:** Create, Read, Update, Delete
**Тип данных:** Mock/localStorage
**React Query:** Нет
**Размер кода:** 486 строк

---

### 🟡 /settings/database

**Компонент:** `DatabaseSettings`
**Файл:** `DatabaseSettings.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 65%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**Используемые сервисы:** apiConfigService
**CRUD операции:** Create, Read, Update, Delete
**Тип данных:** Mock/localStorage
**React Query:** Нет
**Размер кода:** 631 строк

---

### 🟡 /settings/partial-migration

**Компонент:** `PartialMigrationSettings`
**Файл:** `PartialMigrationSettings.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 65%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**Используемые сервисы:** apiConfigService
**CRUD операции:** Create, Read, Update
**Тип данных:** Mock/localStorage
**React Query:** Нет
**Размер кода:** 538 строк

---

### 🟢 /settings/nomenclature

**Компонент:** `Nomenclature`
**Файл:** `Nomenclature.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 70%
**Сложность миграции:** средняя
**Временные затраты:** 2-4 часа
**CRUD операции:** Create, Update
**Тип данных:** Реальный API
**React Query:** Нет
**Размер кода:** 47 строк

---

### 🟡 /settings/workflows

**Компонент:** `Workflows`
**Файл:** `Workflows.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 55%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**Используемые сервисы:** workflowsService
**CRUD операции:** Create, Read, Update, Delete
**Тип данных:** Реальный API
**React Query:** Нет
**Размер кода:** 707 строк

---

## 📂 РАЗДЕЛ NETWORK (8 страниц)

### 🟢 /network/overview

**Компонент:** `NetworkOverview`
**Файл:** `NetworkOverview.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 70%
**Сложность миграции:** средняя
**Временные затраты:** 2-4 часа
**CRUD операции:** Read, Update
**Тип данных:** Реальный API
**React Query:** Нет
**Размер кода:** 209 строк

---

### 🟢 /network/sales-analysis

**Компонент:** `SalesAnalysisPage`
**Файл:** `SalesAnalysisPage.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 75%
**Сложность миграции:** низкая
**Временные затраты:** 30 мин - 1 час
**CRUD операции:** Нет
**Тип данных:** Реальный API
**React Query:** Нет
**Размер кода:** 55 строк

---

### 🟡 /network/operations-transactions

**Компонент:** `OperationsTransactionsPageSimple`
**Файл:** `OperationsTransactionsPageSimple.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 65%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**Используемые сервисы:** operationsService
**CRUD операции:** Create, Read, Update, Delete
**Тип данных:** Mock/localStorage
**React Query:** Нет
**Размер кода:** 423 строк

---

### 🟢 /network/price-history

**Компонент:** `PriceHistoryPage`
**Файл:** `PriceHistoryPage.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 80%
**Сложность миграции:** средняя
**Временные затраты:** 2-4 часа
**CRUD операции:** Read, Update
**Тип данных:** Mock/localStorage
**React Query:** Нет
**Размер кода:** 439 строк

---

### 🟡 /network/fuel-stocks

**Компонент:** `FuelStocksPage`
**Файл:** `FuelStocksPage.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 65%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**Используемые сервисы:** fuelStocksHistoryService, nomenclatureService
**CRUD операции:** Create, Read, Update
**Тип данных:** Mock/localStorage
**React Query:** Нет
**Размер кода:** 880 строк

---

### 🟡 /network/equipment-log

**Компонент:** `NetworkEquipmentLog`
**Файл:** `NetworkEquipmentLog.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 60%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**Используемые сервисы:** equipment, components, commandsService, tradingPointsService, networksService
**CRUD операции:** Create, Read, Update
**Тип данных:** Mock/localStorage
**React Query:** Нет
**Размер кода:** 950 строк

---

### 🟢 /network/notifications

**Компонент:** `NotificationRules`
**Файл:** `NotificationRules.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 70%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**CRUD операции:** Create, Read, Update, Delete
**Тип данных:** Mock/localStorage
**React Query:** Нет
**Размер кода:** 863 строк

---

### 🟢 /network/messages

**Компонент:** `Messages`
**Файл:** `Messages.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 70%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**CRUD операции:** Create, Read, Update, Delete
**Тип данных:** Mock/localStorage
**React Query:** Нет
**Размер кода:** 625 строк

---

## 📂 РАЗДЕЛ POINT (4 страниц)

### 🟡 /point/prices

**Компонент:** `Prices`
**Файл:** `Prices.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 65%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**Используемые сервисы:** nomenclatureService, pricesCache
**CRUD операции:** Create, Read, Update
**Тип данных:** Mock/localStorage
**React Query:** Нет
**Размер кода:** 1128 строк

---

### 🟡 /point/tanks

**Компонент:** `Tanks`
**Файл:** `Tanks.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 65%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**Используемые сервисы:** equipment
**CRUD операции:** Create, Read, Update
**Тип данных:** Mock/localStorage
**React Query:** Нет
**Размер кода:** 1638 строк

---

### 🟡 /point/shift-reports

**Компонент:** `ShiftReports`
**Файл:** `ShiftReports.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 55%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**Используемые сервисы:** shiftReportsService
**CRUD операции:** Create, Read, Update
**Тип данных:** Реальный API
**React Query:** Нет
**Размер кода:** 818 строк

---

### 🟡 /point/equipment

**Компонент:** `Equipment`
**Файл:** `Equipment.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 50%
**Сложность миграции:** высокая
**Временные затраты:** 1-2 дня
**Используемые сервисы:** components, tradingPointsService, tradingPointScanService, tanksService
**CRUD операции:** Create, Read, Update, Delete
**Тип данных:** Реальный API
**React Query:** Нет
**Размер кода:** 999 строк

---

## 📂 РАЗДЕЛ OTHER (2 страниц)

### 🟢 /

**Компонент:** `NetworkOverview`
**Файл:** `NetworkOverview.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 70%
**Сложность миграции:** средняя
**Временные затраты:** 2-4 часа
**CRUD операции:** Read, Update
**Тип данных:** Реальный API
**React Query:** Нет
**Размер кода:** 209 строк

---

### 🟢 /profile

**Компонент:** `Profile`
**Файл:** `Profile.tsx`
**Статус загрузки:** ✅ Существует
**Готовность к Supabase:** 75%
**Сложность миграции:** средняя
**Временные затраты:** 2-4 часа
**Используемые сервисы:** userService
**CRUD операции:** Read, Update
**Тип данных:** Mock/localStorage
**React Query:** Нет
**Размер кода:** 563 строк

---

## 🎯 РЕКОМЕНДАЦИИ ПО МИГРАЦИИ

### 🟢 Высокий приоритет (готовы к миграции): 16 страниц

- **/admin/users-and-roles** - 1-2 дня
- **/admin/users** - 1-2 дня
- **/admin/audit** - 1-2 дня
- **/admin/data-migration** - 30 мин - 1 час
- **/admin/test-services** - 2-4 часа
- **/admin/test-simple** - 2-4 часа
- **/admin/test-debug** - 2-4 часа
- **/admin/data-inspector** - 1-2 дня
- **/settings/nomenclature** - 2-4 часа
- **/** - 2-4 часа
- **/network/overview** - 2-4 часа
- **/network/sales-analysis** - 30 мин - 1 час
- **/network/price-history** - 2-4 часа
- **/network/notifications** - 1-2 дня
- **/network/messages** - 1-2 дня
- **/profile** - 2-4 часа

### 🟡 Средний приоритет (требуют подготовки): 22 страниц

- **/admin/users-and-roles-new** - 1-2 дня
- **/admin/roles** - 1-2 дня
- **/admin/instructions** - 1-2 дня
- **/admin/networks** - 1-2 дня
- **/admin/legal-documents** - 1-2 дня
- **/admin/legal-documents/users-acceptances** - 2-4 часа
- **/admin/legal-documents/:docType/edit** - 1-2 дня
- **/settings/dictionaries/equipment-types** - 1-2 дня
- **/settings/dictionaries/component-types** - 1-2 дня
- **/settings/dictionaries/command-templates** - 1-2 дня
- **/settings/templates/command-templates** - 1-2 дня
- **/settings/connections** - 1-2 дня
- **/settings/database** - 1-2 дня
- **/settings/partial-migration** - 1-2 дня
- **/settings/workflows** - 1-2 дня
- **/network/operations-transactions** - 1-2 дня
- **/network/fuel-stocks** - 1-2 дня
- **/network/equipment-log** - 1-2 дня
- **/point/prices** - 1-2 дня
- **/point/tanks** - 1-2 дня
- **/point/shift-reports** - 1-2 дня
- **/point/equipment** - 1-2 дня

### 🔴 Низкий приоритет (требуют серьезной доработки): 0 страниц


## ⏱️ ОБЩИЕ ВРЕМЕННЫЕ ОЦЕНКИ

**Общее время миграции:** ~47 часов (6 рабочих дней)

**Этапы миграции:**
1. Высокий приоритет: ~14 часов
2. Средний приоритет: ~19 часов
3. Низкий приоритет: ~14 часов

