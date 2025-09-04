-- Упрощенная схема таблиц для цен (без сложных функций)

-- Таблица текущих цен на топливо
CREATE TABLE prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trading_point_id UUID NOT NULL,
  fuel_type_id UUID NOT NULL,
  nomenclature_id UUID,
  
  -- Цены в копейках
  price_net INTEGER NOT NULL CHECK (price_net >= 0),
  vat_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  price_gross INTEGER NOT NULL CHECK (price_gross >= 0),
  
  -- Метаданные
  source VARCHAR(20) NOT NULL DEFAULT 'manual',
  currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
  unit VARCHAR(10) NOT NULL DEFAULT 'L',
  
  -- Период действия
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Аудит
  created_by UUID,
  reason TEXT,
  package_id UUID,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Таблица пакетов цен
CREATE TABLE price_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID NOT NULL,
  
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  
  trading_point_ids UUID[] NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  
  created_by UUID NOT NULL,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Таблица строк пакета цен
CREATE TABLE price_package_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL,
  fuel_type_id UUID NOT NULL,
  
  price_net INTEGER NOT NULL CHECK (price_net >= 0),
  vat_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  price_gross INTEGER NOT NULL CHECK (price_gross >= 0),
  
  unit VARCHAR(10) NOT NULL DEFAULT 'L',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Таблица истории цен
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trading_point_id UUID NOT NULL,
  fuel_type_id UUID NOT NULL,
  
  old_price_net INTEGER,
  old_price_gross INTEGER,
  new_price_net INTEGER NOT NULL,
  new_price_gross INTEGER NOT NULL,
  vat_rate DECIMAL(5,2) NOT NULL DEFAULT 20.00,
  
  change_type VARCHAR(20) NOT NULL DEFAULT 'update',
  source VARCHAR(20) NOT NULL DEFAULT 'manual',
  reason TEXT,
  package_id UUID,
  
  effective_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  changed_by UUID,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);