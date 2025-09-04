-- Схема таблиц для управления ценами на топливо
-- Создаем таблицы для хранения текущих цен, пакетов цен и истории изменений

-- Таблица текущих цен на топливо
CREATE TABLE IF NOT EXISTS prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trading_point_id UUID NOT NULL REFERENCES trading_points(id) ON DELETE CASCADE,
  fuel_type_id UUID NOT NULL REFERENCES fuel_types(id) ON DELETE CASCADE,
  nomenclature_id UUID REFERENCES nomenclature(id) ON DELETE SET NULL,
  
  -- Цены в копейках для точности
  price_net INTEGER NOT NULL CHECK (price_net >= 0), -- Цена без НДС в копейках
  vat_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00 CHECK (vat_rate >= 0 AND vat_rate <= 100), -- Ставка НДС в процентах
  price_gross INTEGER NOT NULL CHECK (price_gross >= 0), -- Цена с НДС в копейках
  
  -- Метаданные цены
  source VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'import', 'api', 'package', 'system')),
  currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
  unit VARCHAR(10) NOT NULL DEFAULT 'L',
  
  -- Период действия цены
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Аудит
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT, -- Причина изменения цены
  package_id UUID, -- Ссылка на пакет цен (если применялся)
  metadata JSONB DEFAULT '{}', -- Дополнительные данные
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Индексы для быстрого поиска
  CONSTRAINT prices_unique_active UNIQUE (trading_point_id, fuel_type_id, valid_from) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Таблица пакетов цен (для массового изменения цен)
CREATE TABLE IF NOT EXISTS price_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  
  -- Описание пакета
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  
  -- Применение пакета
  trading_point_ids UUID[] NOT NULL DEFAULT '{}', -- Торговые точки для применения
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'active', 'archived', 'cancelled')),
  
  -- Период действия
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  
  -- Утверждение пакета
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  
  -- Аудит
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Уникальность кода пакета в рамках сети
  CONSTRAINT price_packages_unique_code UNIQUE (network_id, code)
);

-- Таблица строк пакета цен
CREATE TABLE IF NOT EXISTS price_package_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES price_packages(id) ON DELETE CASCADE,
  fuel_type_id UUID NOT NULL REFERENCES fuel_types(id) ON DELETE CASCADE,
  
  -- Цены в копейках
  price_net INTEGER NOT NULL CHECK (price_net >= 0),
  vat_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00 CHECK (vat_rate >= 0 AND vat_rate <= 100),
  price_gross INTEGER NOT NULL CHECK (price_gross >= 0),
  
  unit VARCHAR(10) NOT NULL DEFAULT 'L',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Уникальность вида топлива в рамках пакета
  CONSTRAINT price_package_lines_unique_fuel UNIQUE (package_id, fuel_type_id)
);

-- Таблица истории изменения цен
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trading_point_id UUID NOT NULL REFERENCES trading_points(id) ON DELETE CASCADE,
  fuel_type_id UUID NOT NULL REFERENCES fuel_types(id) ON DELETE CASCADE,
  
  -- Старые и новые значения
  old_price_net INTEGER,
  old_price_gross INTEGER,
  new_price_net INTEGER NOT NULL,
  new_price_gross INTEGER NOT NULL,
  vat_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  
  -- Метаданные изменения
  change_type VARCHAR(20) NOT NULL DEFAULT 'update' CHECK (change_type IN ('create', 'update', 'activate', 'deactivate')),
  source VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'import', 'api', 'package', 'system')),
  reason TEXT,
  package_id UUID REFERENCES price_packages(id) ON DELETE SET NULL,
  
  -- Эффективная дата изменения
  effective_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Аудит
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы для оптимизации запросов

-- Цены: поиск активных цен по торговой точке и топливу
CREATE INDEX IF NOT EXISTS idx_prices_active_lookup ON prices (trading_point_id, fuel_type_id, is_active, valid_from DESC);

-- Цены: поиск по номенклатуре
CREATE INDEX IF NOT EXISTS idx_prices_nomenclature ON prices (nomenclature_id) WHERE nomenclature_id IS NOT NULL;

-- Цены: поиск по пакету
CREATE INDEX IF NOT EXISTS idx_prices_package ON prices (package_id) WHERE package_id IS NOT NULL;

-- Пакеты цен: поиск по сети и статусу
CREATE INDEX IF NOT EXISTS idx_price_packages_network_status ON price_packages (network_id, status, created_at DESC);

-- История цен: поиск по торговой точке и периоду
CREATE INDEX IF NOT EXISTS idx_price_history_trading_point_date ON price_history (trading_point_id, effective_date DESC);

-- История цен: поиск по топливу и периоду
CREATE INDEX IF NOT EXISTS idx_price_history_fuel_date ON price_history (fuel_type_id, effective_date DESC);

-- Функции для автоматизации

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Применяем триггеры
CREATE TRIGGER update_prices_updated_at 
  BEFORE UPDATE ON prices 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_packages_updated_at 
  BEFORE UPDATE ON price_packages 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Функция для получения активной цены
CREATE OR REPLACE FUNCTION get_active_price(
  p_trading_point_id UUID,
  p_fuel_type_id UUID,
  p_at_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  id UUID,
  price_net INTEGER,
  price_gross INTEGER,
  vat_rate DECIMAL,
  valid_from TIMESTAMPTZ,
  source VARCHAR,
  fuel_type_name VARCHAR,
  trading_point_name VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.price_net,
    p.price_gross,
    p.vat_rate,
    p.valid_from,
    p.source,
    ft.name AS fuel_type_name,
    tp.name AS trading_point_name
  FROM prices p
  JOIN fuel_types ft ON p.fuel_type_id = ft.id
  JOIN trading_points tp ON p.trading_point_id = tp.id
  WHERE p.trading_point_id = p_trading_point_id
    AND p.fuel_type_id = p_fuel_type_id
    AND p.is_active = true
    AND p.valid_from <= p_at_date
    AND (p.valid_to IS NULL OR p.valid_to > p_at_date)
  ORDER BY p.valid_from DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Функция для записи в историю при изменении цен
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
  -- При создании новой цены
  IF TG_OP = 'INSERT' THEN
    INSERT INTO price_history (
      trading_point_id,
      fuel_type_id,
      old_price_net,
      old_price_gross,
      new_price_net,
      new_price_gross,
      vat_rate,
      change_type,
      source,
      reason,
      package_id,
      effective_date,
      changed_by,
      metadata
    ) VALUES (
      NEW.trading_point_id,
      NEW.fuel_type_id,
      NULL,
      NULL,
      NEW.price_net,
      NEW.price_gross,
      NEW.vat_rate,
      'create',
      NEW.source,
      NEW.reason,
      NEW.package_id,
      NEW.valid_from,
      NEW.created_by,
      NEW.metadata
    );
    RETURN NEW;
  END IF;
  
  -- При обновлении цены
  IF TG_OP = 'UPDATE' THEN
    -- Логируем только если изменились цены или статус
    IF (OLD.price_net != NEW.price_net OR 
        OLD.price_gross != NEW.price_gross OR 
        OLD.is_active != NEW.is_active) THEN
      
      INSERT INTO price_history (
        trading_point_id,
        fuel_type_id,
        old_price_net,
        old_price_gross,
        new_price_net,
        new_price_gross,
        vat_rate,
        change_type,
        source,
        reason,
        package_id,
        effective_date,
        changed_by,
        metadata
      ) VALUES (
        NEW.trading_point_id,
        NEW.fuel_type_id,
        OLD.price_net,
        OLD.price_gross,
        NEW.price_net,
        NEW.price_gross,
        NEW.vat_rate,
        CASE WHEN OLD.is_active != NEW.is_active THEN 
          CASE WHEN NEW.is_active THEN 'activate' ELSE 'deactivate' END
        ELSE 'update' END,
        NEW.source,
        NEW.reason,
        NEW.package_id,
        NEW.updated_at,
        NEW.created_by,
        NEW.metadata
      );
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для автоматического логирования изменений
CREATE TRIGGER log_price_changes
  AFTER INSERT OR UPDATE ON prices
  FOR EACH ROW EXECUTE FUNCTION log_price_change();

-- Комментарии к таблицам
COMMENT ON TABLE prices IS 'Текущие цены на топливо по торговым точкам';
COMMENT ON TABLE price_packages IS 'Пакеты цен для массового изменения';
COMMENT ON TABLE price_package_lines IS 'Строки пакета цен с ценами по видам топлива';
COMMENT ON TABLE price_history IS 'История изменения цен с аудитом';

-- Комментарии к важным колонкам
COMMENT ON COLUMN prices.price_net IS 'Цена без НДС в копейках для точности';
COMMENT ON COLUMN prices.price_gross IS 'Цена с НДС в копейках (рассчитывается автоматически)';
COMMENT ON COLUMN prices.vat_rate IS 'Ставка НДС в процентах (обычно 20%)';
COMMENT ON COLUMN prices.source IS 'Источник цены: manual, import, api, package, system';
COMMENT ON COLUMN prices.valid_from IS 'Дата и время начала действия цены';
COMMENT ON COLUMN prices.valid_to IS 'Дата и время окончания действия (NULL = бессрочно)';

-- Права доступа (настраиваются администратором)
-- GRANT SELECT, INSERT, UPDATE ON prices TO authenticated;
-- GRANT SELECT, INSERT, UPDATE ON price_packages TO authenticated; 
-- GRANT SELECT, INSERT, UPDATE ON price_package_lines TO authenticated;
-- GRANT SELECT ON price_history TO authenticated;