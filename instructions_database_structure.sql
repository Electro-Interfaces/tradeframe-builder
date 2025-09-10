-- ============================================
-- БАЗА ДАННЫХ ДЛЯ ПОМОЩИ НА СТРАНИЦАХ ПРИЛОЖЕНИЯ
-- Простое хранение подсказок и инструкций для пользователей
-- ============================================

-- Таблица помощи для страниц приложения
CREATE TABLE page_help (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    
    -- Привязка к странице
    route VARCHAR(100) NOT NULL, -- Маршрут страницы (/admin/users, /point/prices, /network/overview)
    section VARCHAR(100), -- Секция на странице (если есть подразделы)
    
    -- Содержимое помощи
    title VARCHAR(200) NOT NULL, -- Заголовок помощи
    content TEXT NOT NULL, -- Текст помощи (поддерживает HTML/Markdown)
    content_type VARCHAR(20) NOT NULL DEFAULT 'markdown', -- 'markdown', 'html'
    
    -- Тип помощи
    help_type VARCHAR(20) NOT NULL DEFAULT 'tooltip', -- 'tooltip', 'modal', 'sidebar', 'inline'
    
    -- Позиционирование (для tooltip и modal)
    position VARCHAR(20) DEFAULT 'right', -- 'top', 'bottom', 'left', 'right', 'center'
    trigger_selector VARCHAR(200), -- CSS селектор элемента-триггера
    
    -- Управление отображением
    is_active BOOLEAN NOT NULL DEFAULT true,
    show_for_roles TEXT[], -- Массив ролей, которым показывать помощь (null = всем)
    sort_order INTEGER NOT NULL DEFAULT 0,
    
    -- Системные поля
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT page_help_route_section_unique UNIQUE(tenant_id, route, section, help_type),
    CONSTRAINT page_help_valid_content_type CHECK (content_type IN ('markdown', 'html')),
    CONSTRAINT page_help_valid_help_type CHECK (help_type IN ('tooltip', 'modal', 'sidebar', 'inline')),
    CONSTRAINT page_help_valid_position CHECK (position IN ('top', 'bottom', 'left', 'right', 'center'))
);

-- Создание индексов для оптимизации запросов
CREATE INDEX idx_page_help_route ON page_help(route) WHERE deleted_at IS NULL;
CREATE INDEX idx_page_help_route_section ON page_help(route, section) WHERE deleted_at IS NULL;
CREATE INDEX idx_page_help_active ON page_help(is_active, sort_order) WHERE is_active = true AND deleted_at IS NULL;

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_page_help_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_page_help_updated_at BEFORE UPDATE ON page_help FOR EACH ROW EXECUTE FUNCTION update_page_help_updated_at();

-- Примеры записей помощи для основных страниц
INSERT INTO page_help (route, title, content, help_type, position) VALUES
('/admin/users', 'Управление пользователями', '# Управление пользователями\n\nНа этой странице вы можете:\n- Создавать новых пользователей\n- Редактировать данные существующих\n- Назначать роли\n- Блокировать доступ\n\nДля создания пользователя нажмите кнопку **"Новый пользователь"**.', 'sidebar', 'right'),
('/admin/roles', 'Управление ролями', '# Управление ролями\n\nРоли определяют права доступа пользователей к различным разделам системы.\n\n**Системные роли** нельзя удалять или изменять.\n**Пользовательские роли** можно настраивать под ваши потребности.', 'sidebar', 'right'),
('/point/prices', 'Цены на топливо', '# Цены на топливо\n\nЗдесь отображаются актуальные цены на все виды топлива.\n\n**Автообновление** - цены загружаются автоматически при выборе АЗС.\n**STS API** - для получения данных используется внешний API.', 'modal', 'center'),
('/network/overview', 'Обзор сети', '# Обзор торговой сети\n\nОбщая информация по всем АЗС выбранной торговой сети:\n- Количество активных точек\n- Средние цены по топливу\n- Статус подключений\n\nВыберите сеть в выпадающем списке для просмотра данных.', 'sidebar', 'right');

-- Комментарии к таблице
COMMENT ON TABLE page_help IS 'Помощь и подсказки для страниц приложения';

-- Примеры запросов для использования:

-- Получить помощь для конкретной страницы
-- SELECT * FROM page_help 
-- WHERE route = '/admin/users' 
--   AND is_active = true 
--   AND deleted_at IS NULL 
-- ORDER BY sort_order;

-- Получить все активные подсказки
-- SELECT route, title, help_type, COUNT(*) as help_count
-- FROM page_help 
-- WHERE is_active = true AND deleted_at IS NULL
-- GROUP BY route, title, help_type
-- ORDER BY route;