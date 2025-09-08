# 📊 АНАЛИЗ РЕАЛЬНЫХ РАЗДЕЛОВ МЕНЮ ПРИЛОЖЕНИЯ

## 🎯 ИЗВЛЕЧЕНИЕ ВСЕХ РОУТОВ ИЗ App.tsx

### 👑 АДМИНИСТРАТИВНЫЕ РАЗДЕЛЫ (/admin):
1. **Users & Roles** (`/admin/users-and-roles`) → `Users`
2. **Users** (`/admin/users`) → `AdminUsers` 
3. **Roles** (`/admin/roles`) → `Roles`
4. **Instructions** (`/admin/instructions`) → `Instructions`
5. **Networks** (`/admin/networks`) → `NetworksPage`
6. **Audit Log** (`/admin/audit`) → `AuditLog`
7. **Data Migration** (`/admin/data-migration`) → `DataMigration`
8. **Test Services** (`/admin/test-services`) → `TestServices`
9. **Data Inspector** (`/admin/data-inspector`) → `DataInspector`
10. **Legal Documents** (`/admin/legal-documents`) → `LegalDocuments`

### ⚙️ НАСТРОЙКИ СИСТЕМЫ (/settings):
11. **Equipment Types** (`/settings/dictionaries/equipment-types`) → `EquipmentTypes`
12. **Component Types** (`/settings/dictionaries/component-types`) → `ComponentTypes`
13. **Command Templates** (`/settings/dictionaries/command-templates`) → `CommandTemplates`
14. **New Command Templates** (`/settings/templates/command-templates`) → `NewCommandTemplates`
15. **Connections** (`/settings/connections`) → `Connections`
16. **Data Exchange** (`/settings/data-exchange`) → `DatabaseSettings`
17. **System Integrations** (`/settings/integrations`) → `SystemIntegrations`
18. **Nomenclature** (`/settings/nomenclature`) → `Nomenclature`
19. **Workflows** (`/settings/workflows`) → `Workflows`

### 🌐 СЕТЕВЫЕ РАЗДЕЛЫ (/network):
20. **Network Overview** (`/network/overview`) → `NetworkOverview`
21. **Sales Analysis** (`/network/sales-analysis`) → `SalesAnalysisPage`
22. **Operations Transactions** (`/network/operations-transactions`) → `OperationsTransactionsPageSimple`
23. **Price History** (`/network/price-history`) → `PriceHistoryPage`
24. **Fuel Stocks** (`/network/fuel-stocks`) → `FuelStocksPage`
25. **Equipment Log** (`/network/equipment-log`) → `NetworkEquipmentLog`
26. **Notifications** (`/network/notifications`) → `NotificationRules`
27. **Messages** (`/network/messages`) → `Messages`

### 🏪 ТОРГОВЫЕ ТОЧКИ (/point):
28. **Prices** (`/point/prices`) → `Prices`
29. **Tanks** (`/point/tanks`) → `Tanks`
30. **Shift Reports** (`/point/shift-reports`) → `ShiftReports`
31. **Equipment** (`/point/equipment`) → `Equipment`

### 👤 ПРОФИЛЬ:
32. **Profile** (`/profile`) → `Profile`
33. **Home** (`/`) → `NetworkOverview`

---

## 📋 ИТОГО: **33 АКТИВНЫХ РАЗДЕЛА МЕНЮ**

### 🔍 АНАЛИЗ КОМПОНЕНТОВ ПО ИСПОЛЬЗОВАНИЮ SUPABASE

Теперь нужно проверить каждый компонент на предмет того, какие сервисы он использует и работают ли эти сервисы с Supabase.

---

## 🎯 КЛЮЧЕВЫЕ РАЗДЕЛЫ ДЛЯ ПРОВЕРКИ:

### 🔥 КРИТИЧНЫЕ (работают с данными):
- **Equipment** - использует `equipmentSupabase` ✅
- **Operations Transactions** - использует `operationsSupabaseService` ✅
- **Prices** - использует `pricesSupabaseService` ✅
- **Tanks** - использует `tanksServiceSupabase` ✅
- **Users** - использует `usersSupabaseService` ✅
- **Messages** - использует `messagesSupabaseService` ✅
- **Instructions** - использует `instructionsSupabaseService` ✅
- **Workflows** - использует `workflowsSupabaseService` ✅

### 📊 ОТЧЕТНЫЕ:
- **Sales Analysis** - нужно проверить сервис
- **Fuel Stocks** - использует `fuelStocksSupabaseService` ✅
- **Shift Reports** - использует `shiftReportsSupabaseService` ✅

### ⚙️ СИСТЕМНЫЕ:
- **Database Settings** - управляет конфигурацией Supabase ✅
- **Data Inspector** - технический раздел для отладки
- **Test Services** - технический раздел для тестирования

---

## 🔄 СЛЕДУЮЩИЙ ШАГ: 
Проверим каждый компонент и определим, какие сервисы он использует и работают ли они через Supabase.