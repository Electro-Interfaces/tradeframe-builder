-- ================================================
-- База данных для управления пользователями и ролями
-- Создано на основе анализа существующей структуры приложения
-- ================================================

-- Включаем расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================
-- 1. ОСНОВНЫЕ СПРАВОЧНИКИ И ЕНУМЫ
-- ================================================

-- Типы пользовательских статусов
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'blocked');

-- Типы действий разрешений
CREATE TYPE permission_action AS ENUM ('read', 'write', 'delete', 'manage', 'view_menu');

-- Области действия ролей
CREATE TYPE role_scope AS ENUM ('global', 'network', 'trading_point', 'assigned');

-- Операторы для условий разрешений
CREATE TYPE permission_operator AS ENUM ('=', '!=', 'in', 'not_in', 'contains', 'starts_with');

-- ================================================
-- 2. ТАБЛИЦА ТЕНАНТОВ (мультитенантность)
-- ================================================

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- Вставляем дефолтного тенанта
INSERT INTO tenants (id, name, code, description) VALUES 
('00000000-0000-0000-0000-000000000001', 'Система по умолчанию', 'default', 'Основной тенант системы');

-- ================================================
-- 3. ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ
-- ================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Основная информация
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    
    -- Статус и безопасность
    status user_status DEFAULT 'active',
    pwd_salt VARCHAR(255) NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    pwd_hash VARCHAR(255) NOT NULL,
    
    -- Дополнительная информация для профиля
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    middle_name VARCHAR(100),
    position VARCHAR(255),
    department VARCHAR(255),
    
    -- Пользовательские настройки
    preferences JSONB DEFAULT '{}',
    
    -- Метаданные
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    
    -- Индексы
    CONSTRAINT users_tenant_email_unique UNIQUE (tenant_id, email)
);

-- Создаем индексы для быстрого поиска
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- ================================================
-- 4. ТАБЛИЦА РОЛЕЙ
-- ================================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Основная информация
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Область действия
    scope role_scope DEFAULT 'global',
    scope_values TEXT[], -- массив ID для ограничения области (сети, точки)
    
    -- Флаги
    is_system BOOLEAN DEFAULT FALSE, -- системная роль (нельзя удалить)
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Метаданные
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    
    -- Ограничения
    CONSTRAINT roles_tenant_code_unique UNIQUE (tenant_id, code)
);

-- Создаем индексы
CREATE INDEX idx_roles_tenant_id ON roles(tenant_id);
CREATE INDEX idx_roles_code ON roles(code);
CREATE INDEX idx_roles_scope ON roles(scope);
CREATE INDEX idx_roles_is_active ON roles(is_active);
CREATE INDEX idx_roles_deleted_at ON roles(deleted_at);

-- ================================================
-- 5. ТАБЛИЦА РАЗРЕШЕНИЙ РОЛЕЙ
-- ================================================

CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    
    -- Разрешение
    section VARCHAR(100) NOT NULL, -- раздел системы (networks, operations, etc.)
    resource VARCHAR(100) NOT NULL, -- конкретный ресурс (trading_points, transactions, etc.)
    actions permission_action[] NOT NULL, -- массив разрешенных действий
    
    -- Условия доступа (JSONB для гибкости)
    conditions JSONB DEFAULT '[]',
    
    -- Метаданные
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создаем индексы для быстрого поиска разрешений
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_section ON role_permissions(section);
CREATE INDEX idx_role_permissions_resource ON role_permissions(resource);
CREATE INDEX idx_role_permissions_section_resource ON role_permissions(section, resource);

-- ================================================
-- 6. ТАБЛИЦА НАЗНАЧЕНИЯ РОЛЕЙ ПОЛЬЗОВАТЕЛЯМ
-- ================================================

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    
    -- Область действия для конкретного назначения
    scope_value VARCHAR(255), -- конкретное значение области (ID сети/точки)
    
    -- Временные ограничения
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id), -- кем назначена
    expires_at TIMESTAMP WITH TIME ZONE, -- срок действия (опционально)
    
    -- Флаги
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Ограничения
    CONSTRAINT user_roles_unique UNIQUE (user_id, role_id, scope_value)
);

-- Создаем индексы
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_user_roles_scope_value ON user_roles(scope_value);
CREATE INDEX idx_user_roles_expires_at ON user_roles(expires_at);

-- ================================================
-- 7. ТАБЛИЦА ПРЯМЫХ РАЗРЕШЕНИЙ ПОЛЬЗОВАТЕЛЕЙ
-- ================================================

CREATE TABLE user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Разрешение (аналогично role_permissions)
    section VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    actions permission_action[] NOT NULL,
    conditions JSONB DEFAULT '[]',
    
    -- Метаданные
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Флаги
    is_active BOOLEAN DEFAULT TRUE
);

-- Создаем индексы
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_section ON user_permissions(section);
CREATE INDEX idx_user_permissions_resource ON user_permissions(resource);

-- ================================================
-- 8. ТАБЛИЦА СЕССИЙ
-- ================================================

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Данные сессии
    token_hash VARCHAR(255) NOT NULL, -- хэш токена
    refresh_token_hash VARCHAR(255), -- хэш refresh токена
    
    -- Временные метки
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    refresh_expires_at TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Метаданные
    user_agent TEXT,
    ip_address INET,
    
    -- Флаги
    is_active BOOLEAN DEFAULT TRUE
);

-- Создаем индексы
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);

-- ================================================
-- 9. ТАБЛИЦА ЖУРНАЛА АУДИТА
-- ================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Пользователь и действие
    user_id UUID REFERENCES users(id),
    action VARCHAR(255) NOT NULL, -- Auth.Login.Success, User.Created, Role.Updated, etc.
    
    -- Сущность
    entity_type VARCHAR(100) NOT NULL, -- User, Role, Session, etc.
    entity_id UUID,
    
    -- Изменения
    old_values JSONB,
    new_values JSONB,
    
    -- Метаданные
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создаем индексы
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ================================================
-- 10. ФУНКЦИИ И ТРИГГЕРЫ
-- ================================================

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Функция для хеширования паролей
CREATE OR REPLACE FUNCTION hash_password(password TEXT, salt TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(password, salt);
END;
$$ LANGUAGE plpgsql;

-- Функция для проверки пароля
CREATE OR REPLACE FUNCTION verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN hash = crypt(password, hash);
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 11. ПРЕДСТАВЛЕНИЯ (VIEWS)
-- ================================================

-- Представление для пользователей с ролями
CREATE OR REPLACE VIEW user_roles_view AS
SELECT 
    u.id as user_id,
    u.tenant_id,
    u.email,
    u.name,
    u.status,
    u.last_login,
    u.created_at as user_created_at,
    
    ur.role_id,
    r.code as role_code,
    r.name as role_name,
    r.scope as role_scope,
    ur.scope_value,
    ur.assigned_at,
    ur.expires_at,
    ur.is_active as role_assignment_active,
    
    CASE 
        WHEN ur.expires_at IS NULL THEN TRUE
        WHEN ur.expires_at > CURRENT_TIMESTAMP THEN TRUE
        ELSE FALSE
    END as is_role_valid
FROM users u
JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = TRUE
JOIN roles r ON ur.role_id = r.id AND r.is_active = TRUE AND r.deleted_at IS NULL
WHERE u.deleted_at IS NULL;

-- Представление для эффективных разрешений пользователя
CREATE OR REPLACE VIEW user_effective_permissions AS
WITH role_perms AS (
    SELECT 
        ur.user_id,
        rp.section,
        rp.resource,
        rp.actions,
        rp.conditions
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id AND r.is_active = TRUE AND r.deleted_at IS NULL
    JOIN role_permissions rp ON r.id = rp.role_id
    WHERE ur.is_active = TRUE
    AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
),
direct_perms AS (
    SELECT 
        user_id,
        section,
        resource,
        actions,
        conditions
    FROM user_permissions
    WHERE is_active = TRUE
    AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
),
all_perms AS (
    SELECT * FROM role_perms
    UNION ALL
    SELECT * FROM direct_perms
)
SELECT 
    user_id,
    section,
    resource,
    array_agg(DISTINCT action) as actions,
    jsonb_agg(DISTINCT conditions) as all_conditions
FROM all_perms
CROSS JOIN LATERAL unnest(actions) as action
GROUP BY user_id, section, resource;

-- ================================================
-- 12. БАЗОВЫЕ ДАННЫЕ
-- ================================================

-- Создаем системного администратора
INSERT INTO users (
    id, 
    tenant_id, 
    email, 
    name, 
    first_name,
    last_name,
    status, 
    pwd_hash,
    preferences
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'admin@system.local',
    'Системный администратор',
    'Системный',
    'Администратор',
    'active',
    crypt('admin123', gen_salt('bf', 8)),
    '{"theme": "dark", "language": "ru"}'::jsonb
);

-- Создаем базовые роли
INSERT INTO roles (id, tenant_id, code, name, description, scope, is_system, is_active) VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'super_admin', 'Суперадминистратор', 'Полный доступ ко всем функциям системы', 'global', TRUE, TRUE),
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'admin', 'Администратор', 'Администратор системы с ограниченными правами', 'global', TRUE, TRUE),
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'manager', 'Менеджер', 'Управление сетями и торговыми точками', 'network', TRUE, TRUE),
('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'operator', 'Оператор', 'Работа с торговыми точками', 'trading_point', TRUE, TRUE),
('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'viewer', 'Наблюдатель', 'Просмотр данных без возможности изменения', 'global', TRUE, TRUE);

-- Разрешения для суперадминистратора (полный доступ)
INSERT INTO role_permissions (role_id, section, resource, actions) VALUES
('00000000-0000-0000-0000-000000000001', '*', '*', ARRAY['read', 'write', 'delete', 'manage', 'view_menu']::permission_action[]);

-- Разрешения для администратора
INSERT INTO role_permissions (role_id, section, resource, actions) VALUES
('00000000-0000-0000-0000-000000000002', 'admin', 'users', ARRAY['read', 'write', 'delete', 'manage', 'view_menu']::permission_action[]),
('00000000-0000-0000-0000-000000000002', 'admin', 'roles', ARRAY['read', 'write', 'delete', 'manage', 'view_menu']::permission_action[]),
('00000000-0000-0000-0000-000000000002', 'admin', 'networks', ARRAY['read', 'write', 'delete', 'manage', 'view_menu']::permission_action[]),
('00000000-0000-0000-0000-000000000002', 'admin', 'audit', ARRAY['read', 'view_menu']::permission_action[]),
('00000000-0000-0000-0000-000000000002', 'settings', '*', ARRAY['read', 'write', 'manage', 'view_menu']::permission_action[]);

-- Разрешения для менеджера
INSERT INTO role_permissions (role_id, section, resource, actions) VALUES
('00000000-0000-0000-0000-000000000003', 'network', '*', ARRAY['read', 'write', 'manage', 'view_menu']::permission_action[]),
('00000000-0000-0000-0000-000000000003', 'point', '*', ARRAY['read', 'write', 'manage', 'view_menu']::permission_action[]),
('00000000-0000-0000-0000-000000000003', 'settings', 'connections', ARRAY['read', 'view_menu']::permission_action[]);

-- Разрешения для оператора
INSERT INTO role_permissions (role_id, section, resource, actions) VALUES
('00000000-0000-0000-0000-000000000004', 'point', 'prices', ARRAY['read', 'write', 'view_menu']::permission_action[]),
('00000000-0000-0000-0000-000000000004', 'point', 'tanks', ARRAY['read', 'write', 'view_menu']::permission_action[]),
('00000000-0000-0000-0000-000000000004', 'point', 'equipment', ARRAY['read', 'view_menu']::permission_action[]),
('00000000-0000-0000-0000-000000000004', 'point', 'shift-reports', ARRAY['read', 'write', 'view_menu']::permission_action[]);

-- Разрешения для наблюдателя
INSERT INTO role_permissions (role_id, section, resource, actions) VALUES
('00000000-0000-0000-0000-000000000005', 'network', '*', ARRAY['read', 'view_menu']::permission_action[]),
('00000000-0000-0000-0000-000000000005', 'point', '*', ARRAY['read', 'view_menu']::permission_action[]);

-- Назначаем роль суперадминистратора системному пользователю
INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');

-- ================================================
-- 13. ПРИМЕРЫ ЗАПРОСОВ ДЛЯ РАБОТЫ С СИСТЕМОЙ
-- ================================================

/*
-- Создание нового пользователя
INSERT INTO users (tenant_id, email, name, pwd_hash) 
VALUES ('00000000-0000-0000-0000-000000000001', 'user@example.com', 'Иван Иванов', crypt('password123', gen_salt('bf', 8)));

-- Назначение роли пользователю
INSERT INTO user_roles (user_id, role_id, assigned_by) 
VALUES ('user_id_here', 'role_id_here', 'admin_id_here');

-- Получение пользователя с ролями
SELECT * FROM user_roles_view WHERE user_id = 'user_id_here';

-- Получение эффективных разрешений пользователя
SELECT * FROM user_effective_permissions WHERE user_id = 'user_id_here';

-- Проверка разрешения
SELECT EXISTS (
    SELECT 1 FROM user_effective_permissions 
    WHERE user_id = 'user_id_here' 
    AND section = 'admin' 
    AND resource = 'users' 
    AND 'write'::permission_action = ANY(actions)
);
*/

-- ================================================
-- ЗАВЕРШЕНИЕ СОЗДАНИЯ СХЕМЫ
-- ================================================

COMMENT ON SCHEMA public IS 'Схема базы данных для управления пользователями, ролями и разрешениями с поддержкой мультитенантности';