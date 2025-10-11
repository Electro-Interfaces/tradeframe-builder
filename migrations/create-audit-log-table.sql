-- =====================================================
-- Создание таблицы журнала аудита (audit_log)
-- Дата: 2025-10-11
-- Описание: Реальное логирование всех действий пользователей в системе
-- =====================================================

-- Создаем таблицу audit_log
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Временная метка события
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Информация о пользователе
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,

  -- Описание действия
  action TEXT NOT NULL, -- Человекочитаемое описание: "Изменил цену на АИ-95"
  action_type TEXT NOT NULL, -- Категория: price_change, user_management, equipment_management, authentication, network_settings, reports, system_maintenance

  -- Объект действия
  object TEXT, -- На что было направлено действие: "АЗС-5 на Ленина"
  object_type TEXT, -- Тип объекта: trading_point, equipment, user, network, report
  object_id UUID, -- ID объекта в базе данных

  -- Сетевая информация
  ip_address TEXT,
  user_agent TEXT,

  -- Детальная информация
  details JSONB, -- Информация о том, что изменилось: { before: {...}, after: {...}, reason: "..." }

  -- Метаданные
  metadata JSONB, -- Дополнительная информация: session_id, location, device_info, request_id

  -- Служебные поля
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Индексы для быстрого поиска
  CONSTRAINT check_action_type CHECK (action_type IN (
    'price_change',
    'user_management',
    'equipment_management',
    'authentication',
    'network_settings',
    'reports',
    'system_maintenance',
    'legal_documents',
    'data_migration',
    'api_config'
  ))
);

-- Создаем индексы для оптимизации запросов
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_user_email ON audit_log(user_email);
CREATE INDEX idx_audit_log_action_type ON audit_log(action_type);
CREATE INDEX idx_audit_log_object_type ON audit_log(object_type);
CREATE INDEX idx_audit_log_object_id ON audit_log(object_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- Создаем индекс для поиска по JSONB полям
CREATE INDEX idx_audit_log_details ON audit_log USING gin(details);
CREATE INDEX idx_audit_log_metadata ON audit_log USING gin(metadata);

-- Добавляем комментарии к таблице и столбцам
COMMENT ON TABLE audit_log IS 'Журнал аудита - логирование всех действий пользователей в системе';
COMMENT ON COLUMN audit_log.id IS 'Уникальный идентификатор записи';
COMMENT ON COLUMN audit_log.timestamp IS 'Временная метка когда произошло событие';
COMMENT ON COLUMN audit_log.user_id IS 'ID пользователя из таблицы users';
COMMENT ON COLUMN audit_log.user_email IS 'Email пользователя (хранится отдельно на случай удаления пользователя)';
COMMENT ON COLUMN audit_log.action IS 'Человекочитаемое описание действия';
COMMENT ON COLUMN audit_log.action_type IS 'Категория действия для фильтрации';
COMMENT ON COLUMN audit_log.object IS 'Название объекта над которым было выполнено действие';
COMMENT ON COLUMN audit_log.object_type IS 'Тип объекта';
COMMENT ON COLUMN audit_log.object_id IS 'ID объекта в базе данных';
COMMENT ON COLUMN audit_log.ip_address IS 'IP адрес пользователя';
COMMENT ON COLUMN audit_log.details IS 'JSON с детальной информацией о действии (before/after/reason)';
COMMENT ON COLUMN audit_log.metadata IS 'JSON с метаданными (session_id, user_agent, location, etc)';

-- Создаем RLS политики (Row Level Security)
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Политика: Администраторы могут читать все записи
CREATE POLICY "Администраторы могут читать все записи аудита"
  ON audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.code IN ('admin', 'super_admin')
    )
  );

-- Политика: Пользователи могут читать только свои записи
CREATE POLICY "Пользователи могут читать свои записи аудита"
  ON audit_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Политика: Только система может создавать записи (через service_role)
CREATE POLICY "Система может создавать записи аудита"
  ON audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Создаем функцию для автоматической очистки старых записей (опционально)
CREATE OR REPLACE FUNCTION clean_old_audit_logs(days_to_keep INTEGER DEFAULT 180)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_log
  WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION clean_old_audit_logs IS 'Удаляет записи аудита старше указанного количества дней (по умолчанию 180 дней)';

-- Примеры использования:
-- SELECT clean_old_audit_logs(180); -- Удалить записи старше 6 месяцев
-- SELECT clean_old_audit_logs(365); -- Удалить записи старше года

-- Создаем представление для удобного чтения журнала
CREATE OR REPLACE VIEW audit_log_view AS
SELECT
  al.id,
  al.timestamp,
  al.user_id,
  al.user_email,
  al.user_name,
  u.name as current_user_name, -- Текущее имя пользователя (может отличаться)
  al.action,
  al.action_type,
  al.object,
  al.object_type,
  al.object_id,
  al.ip_address,
  al.details,
  al.metadata,
  al.created_at
FROM audit_log al
LEFT JOIN users u ON al.user_id = u.id
ORDER BY al.timestamp DESC;

COMMENT ON VIEW audit_log_view IS 'Представление журнала аудита с присоединенной информацией о пользователях';

-- Выводим результат
SELECT 'Таблица audit_log успешно создана!' AS result;
SELECT 'Создано индексов: 8' AS indexes;
SELECT 'Создано политик безопасности: 3' AS policies;
SELECT 'Создано служебных функций: 1' AS functions;
