-- ================================================
-- ТАБЛИЦА PAGE_HELP для хранения инструкций и подсказок
-- ================================================

-- Типы помощи
CREATE TYPE help_type AS ENUM ('tooltip', 'modal', 'sidebar', 'inline', 'guide');

-- Статусы инструкций
CREATE TYPE instruction_status AS ENUM ('draft', 'published', 'archived');

-- Таблица для подсказок на страницах
CREATE TABLE page_help (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Привязка к странице
    route VARCHAR(255) NOT NULL, -- маршрут страницы (/dashboard, /equipment, etc.)
    section VARCHAR(100), -- секция на странице (optional)
    
    -- Контент подсказки
    title VARCHAR(500) NOT NULL, -- заголовок подсказки
    content TEXT NOT NULL, -- содержимое (поддерживает markdown)
    content_type VARCHAR(50) DEFAULT 'markdown', -- тип контента
    
    -- Настройки отображения
    help_type help_type DEFAULT 'modal',
    sort_order INTEGER DEFAULT 0, -- порядок отображения
    
    -- Система версионирования
    version INTEGER DEFAULT 1,
    status instruction_status DEFAULT 'draft',
    parent_id UUID REFERENCES page_help(id), -- для версионирования
    
    -- Статус
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Метаданные
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- Временные метки
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- Создаем индексы для быстрого поиска
CREATE INDEX idx_page_help_tenant_id ON page_help(tenant_id);
CREATE INDEX idx_page_help_route ON page_help(route);
CREATE INDEX idx_page_help_section ON page_help(route, section);
CREATE INDEX idx_page_help_status ON page_help(status);
CREATE INDEX idx_page_help_is_active ON page_help(is_active);
CREATE INDEX idx_page_help_deleted_at ON page_help(deleted_at);
CREATE INDEX idx_page_help_sort_order ON page_help(sort_order);

-- Добавляем триггер для автоматического обновления updated_at
CREATE TRIGGER update_page_help_updated_at 
    BEFORE UPDATE ON page_help 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Представление для активных подсказок
CREATE OR REPLACE VIEW active_page_help AS
SELECT 
    id,
    tenant_id,
    route,
    section,
    title,
    content,
    content_type,
    help_type,
    sort_order,
    version,
    status,
    is_active,
    created_at,
    updated_at,
    published_at
FROM page_help
WHERE deleted_at IS NULL
AND is_active = TRUE
ORDER BY route, sort_order, created_at;

-- Комментарии к таблице
COMMENT ON TABLE page_help IS 'Таблица для хранения инструкций и подсказок к страницам системы';
COMMENT ON COLUMN page_help.route IS 'Маршрут страницы, к которой относится подсказка';
COMMENT ON COLUMN page_help.section IS 'Секция на странице (опционально)';
COMMENT ON COLUMN page_help.content IS 'Содержимое подсказки в формате markdown';
COMMENT ON COLUMN page_help.help_type IS 'Тип отображения подсказки';
COMMENT ON COLUMN page_help.sort_order IS 'Порядок отображения подсказок на странице';
COMMENT ON COLUMN page_help.version IS 'Версия инструкции для системы версионирования';
COMMENT ON COLUMN page_help.parent_id IS 'Ссылка на родительскую версию для версионирования';

-- Вставляем несколько тестовых записей
INSERT INTO page_help (tenant_id, route, title, content, help_type, status, is_active, sort_order) VALUES
('00000000-0000-0000-0000-000000000001', '/dashboard', 'Главная панель', 
'## Назначение страницы

Главная панель предоставляет общий обзор состояния системы и ключевые показатели работы сети АЗС.

## Основные элементы

- **Виджеты статистики** - количество активных АЗС, общий объем топлива
- **Быстрые действия** - переходы к основным разделам системы
- **Система уведомлений** - важные оповещения и предупреждения', 
'modal', 'published', TRUE, 0),

('00000000-0000-0000-0000-000000000001', '/equipment', 'Управление оборудованием', 
'## Назначение страницы

Страница для мониторинга и управления всем оборудованием в сети АЗС.

## Основные функции

- **Просмотр состояния** оборудования в реальном времени
- **Управление настройками** ТРК и других устройств  
- **История событий** и журнал операций
- **Техническое обслуживание** и планирование ремонтов', 
'modal', 'published', TRUE, 0),

('00000000-0000-0000-0000-000000000001', '/admin/users', 'Управление пользователями', 
'## Назначение страницы

Административный раздел для управления учетными записями пользователей системы.

## Возможности

- **Создание пользователей** с назначением ролей
- **Редактирование профилей** и контактной информации
- **Управление доступом** и правами пользователей
- **Блокировка аккаунтов** при необходимости', 
'modal', 'published', TRUE, 0);

-- Успешное создание таблицы
SELECT 'Page Help table created successfully' as result;