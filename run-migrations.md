# 🚀 Запуск миграций в Supabase

## ✅ Подготовка завершена:
- URL: https://tohtryzyffcebtyvkxwh.supabase.co
- API Key: настроен
- Подключение: протестировано ✅

## 📋 Следующие шаги:

### Вариант A: Через Supabase Dashboard (Рекомендуется)
1. Откройте **Supabase Dashboard**: https://supabase.com/dashboard/project/tohtryzyffcebtyvkxwh
2. Перейдите в **SQL Editor**
3. Выполните миграции **ПОСЛЕДОВАТЕЛЬНО**:

#### 1️⃣ Основная схема:
```sql
-- Скопируйте содержимое migrations/001_initial_schema.sql
```

#### 2️⃣ Безопасность RLS:
```sql  
-- Скопируйте содержимое migrations/002_row_level_security.sql
```

#### 3️⃣ Начальные данные:
```sql
-- Скопируйте содержимое migrations/003_seed_data.sql
```

#### 4️⃣ Fuel Stock Snapshots:
```sql
-- Скопируйте содержимое migrations/004_fuel_stock_snapshots.sql
```

#### 5️⃣ Legal Documents:
```sql
-- Скопируйте содержимое migrations/005_legal_documents.sql
```

### Вариант B: Через CLI (Требует настройки)
```bash
# Установка Supabase CLI
npm install -g supabase

# Логин и связывание проекта  
supabase login
supabase link --project-ref tohtryzyffcebtyvkxwh

# Выполнение миграций
supabase db push
```

## 🎯 После выполнения миграций:

1. **Проверить таблицы**: В Dashboard > Table Editor должны появиться все таблицы
2. **Тестовые пользователи**: Будут созданы автоматически с паролем `admin123`  
3. **API готов**: Все endpoints будут работать с реальными данными

## 🔧 Готово к работе:
- ✅ 17 таблиц с индексами
- ✅ RLS политики для безопасности  
- ✅ 4 роли пользователей
- ✅ Демо данные для тестирования
- ✅ 14 новых API endpoints