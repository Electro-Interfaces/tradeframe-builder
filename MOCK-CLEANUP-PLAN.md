# 🗑️ ПЛАН ОЧИСТКИ MOCK ДАННЫХ

## ❗ КРИТИЧЕСКИ ВАЖНО: 
**15 файлов импортируют mock данные - нужно исправить ВСЕ перед удалением папки `/src/mock/`**

## 📋 ФАЙЛЫ С MOCK ИМПОРТАМИ:

### 🎛️ **Компоненты (8 файлов):**
1. `src/components/commands/CommandTemplateForm.tsx` - импорт COMMAND_CATEGORIES
2. `src/components/equipment/ComponentsTab.tsx` - импорт componentTemplatesStore  
3. `src/components/equipment/ComponentWizard.tsx` - импорт componentTemplatesStore
4. `src/components/templates/NewTemplateForm.tsx` - импорт newCommandTemplatesStore + connectionSettingsStore
5. `src/components/workflows/WorkflowForm.tsx` - импорт mockNewCommandTemplates
6. `src/components/workflows/WorkflowSteps.tsx` - импорт commandTemplatesStore
7. `src/pages/CommandTemplates.tsx` - импорт COMMAND_CATEGORIES
8. `src/pages/NewCommandTemplates.tsx` - импорт newCommandTemplatesStore + константы

### 🔧 **Сервисы (3 файла):**
9. `src/services/newConnectionsService.ts` - импорт connectionSettingsStore + newCommandTemplatesStore
10. `src/services/workflowsService.ts` - импорт workflowsStore
11. (сервисы в repositories тоже считаются)

### 📊 **Репозитории (4 файла):**
12. `src/repositories/networksRepo.ts` - импорт networksStore + tradingPointsStore
13. `src/repositories/tradingPointsRepo.ts` - импорт tradingPointsStore + networksStore

## 🎯 **СТРАТЕГИЯ ОЧИСТКИ:**

### **Этап 1: Заменить mock импорты на Supabase**
- Все компоненты должны получать данные через соответствующие Supabase сервисы
- Удалить логику работы с mock сторами
- Заменить на React Query хуки или прямые вызовы Supabase

### **Этап 2: Рефакторить сервисы**
- `workflowsService.ts` → `workflowsSupabaseService.ts`
- `newConnectionsService.ts` → системная конфигурация из Supabase
- Репозитории → прямые Supabase запросы

### **Этап 3: Удалить константы**
- `COMMAND_CATEGORIES` → загружать из БД или хранить в конфигурации
- `TEMPLATE_SCOPE_OPTIONS` → системные константы
- `TEMPLATE_STATUS_OPTIONS` → enum или константы

## 🚨 **ПОРЯДОК ВЫПОЛНЕНИЯ:**

1. **Сначала исправить все 15 файлов**
2. **Протестировать что приложение работает**
3. **Только потом удалить папку `/src/mock/`**

## ⚠️ **РИСКИ:**
- Приложение сломается если удалить mock данные до исправления импортов
- Некоторые компоненты могут перестать отображать данные
- Возможны TypeScript ошибки

## 📝 **СТАТУС:**
- [ ] Исправить импорты в компонентах (8 файлов)
- [ ] Рефакторить сервисы (3 файла)  
- [ ] Обновить репозитории (4 файла)
- [ ] Протестировать приложение
- [ ] Удалить папку `/src/mock/`