# Миграция раздела "Правовые документы" на базу данных

## Обзор

Этот документ описывает процесс миграции раздела "Правовые документы" с локального хранения (localStorage) на работу с базой данных Supabase.

## Файлы миграции

### 1. `setup-legal-documents.sql`
**Назначение**: Создание структуры таблиц для правовых документов.

**Таблицы**:
- `document_types` - типы документов (соглашения, политики)
- `document_versions` - версии документов с содержимым
- `user_document_acceptances` - журнал согласий пользователей
- `user_legal_statuses` - текущий статус согласий каждого пользователя  
- `legal_document_audit_log` - журнал аудита действий

**Дополнительно**:
- Индексы для производительности
- Триггеры для автоматического обновления `updated_at`
- Представления для удобных запросов
- Ограничения целостности данных

### 2. `setup-legal-documents-data.sql`
**Назначение**: Заполнение таблиц демо-данными.

**Содержимое**:
- 3 типа документов (tos, privacy, pdn)
- Полные версии документов с HTML и Markdown контентом
- Согласия администратора на все документы
- Записи аудита о создании документов

## Порядок выполнения миграции

### Шаг 1: Подготовка базы данных
```sql
-- Выполните в Supabase SQL Editor или через psql
\i setup-legal-documents.sql
```

### Шаг 2: Заполнение демо-данными
```sql
-- Выполните после создания таблиц
\i setup-legal-documents-data.sql
```

### Шаг 3: Проверка миграции
```sql
-- Проверьте, что таблицы созданы
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%document%' 
  OR table_name LIKE '%legal%';

-- Проверьте демо-данные
SELECT * FROM document_types;
SELECT doc_type_code, version, status FROM document_versions;
SELECT COUNT(*) FROM user_document_acceptances;
```

### Шаг 4: Обновление сервиса

Обновить `src/services/legalDocumentsService.ts`:

1. **Убрать зависимость от localStorage**
2. **Добавить методы работы с Supabase**
3. **Обновить методы CRUD операций**
4. **Добавить кэширование для производительности**

### Шаг 5: Тестирование

1. Проверить загрузку документов на странице
2. Проверить принятие согласий пользователями
3. Проверить создание и публикацию новых версий
4. Проверить журнал аудита

## Структура данных

### Типы документов
- **tos** - Пользовательское соглашение
- **privacy** - Политика конфиденциальности
- **pdn** - Политика защиты персональных данных

### Статусы документов
- **draft** - черновик
- **published** - опубликован
- **archived** - архивирован

### Источники согласий
- **web** - веб-интерфейс
- **mobile** - мобильное приложение
- **api** - через API
- **import** - импорт данных

## Безопасность

### Row Level Security (RLS)
```sql
-- Опционально: включите RLS для дополнительной безопасности
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_document_acceptances ENABLE ROW LEVEL SECURITY;

-- Создайте политики доступа
CREATE POLICY "Admin full access" ON document_types
FOR ALL TO authenticated
USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can view published documents" ON document_versions
FOR SELECT TO authenticated
USING (status = 'published');
```

### Аудит и логирование
Все изменения документов и согласий автоматически записываются в таблицу `legal_document_audit_log` с полной информацией о том, кто, когда и что изменил.

## Производительность

### Индексы
Созданы все необходимые индексы для быстрого поиска:
- По типам документов
- По пользователям
- По датам
- По статусам

### Кэширование
Рекомендуется добавить кэширование часто используемых данных:
- Текущие версии документов
- Статусы согласий пользователей

## Бэкап и восстановление

```sql
-- Создание бэкапа
pg_dump -h your-host -U your-user -d your-db \
  -t document_types \
  -t document_versions \
  -t user_document_acceptances \
  -t user_legal_statuses \
  -t legal_document_audit_log \
  > legal_documents_backup.sql

-- Восстановление
psql -h your-host -U your-user -d your-db -f legal_documents_backup.sql
```

## Мониторинг

### Ключевые метрики
- Количество согласий за период
- Процент пользователей с актуальными согласиями
- Время ответа запросов к документам
- Объем данных в таблицах

### Полезные запросы
```sql
-- Статистика согласий по документам
SELECT * FROM document_acceptance_stats;

-- Пользователи без актуальных согласий
SELECT user_id FROM user_legal_statuses WHERE requires_consent = true;

-- Активность за последний месяц
SELECT DATE(accepted_at) as date, COUNT(*) as acceptances
FROM user_document_acceptances 
WHERE accepted_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(accepted_at)
ORDER BY date;
```

## Готово!

После выполнения всех шагов раздел "Правовые документы" будет полностью мигрирован на работу с базой данных Supabase вместо localStorage.