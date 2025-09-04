-- ===============================================
-- INITIAL SEED DATA
-- Migration: 003_seed_data.sql
-- Default data for system bootstrap
-- ===============================================

-- ===============================================
-- FUEL TYPES
-- ===============================================

INSERT INTO fuel_types (id, name, code, category, density, octane_rating) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'АИ-92', 'AI92', 'Бензин', 0.7200, 92),
('550e8400-e29b-41d4-a716-446655440002', 'АИ-95', 'AI95', 'Бензин', 0.7250, 95),
('550e8400-e29b-41d4-a716-446655440003', 'АИ-98', 'AI98', 'Бензин', 0.7300, 98),
('550e8400-e29b-41d4-a716-446655440004', 'ДТ Летнее', 'DT_SUMMER', 'Дизельное топливо', 0.8200, NULL),
('550e8400-e29b-41d4-a716-446655440005', 'ДТ Зимнее', 'DT_WINTER', 'Дизельное топливо', 0.8150, NULL),
('550e8400-e29b-41d4-a716-446655440006', 'ДТ Арктическое', 'DT_ARCTIC', 'Дизельное топливо', 0.8100, NULL),
('550e8400-e29b-41d4-a716-446655440007', 'Пропан', 'PROPANE', 'Газовое топливо', 0.5080, NULL),
('550e8400-e29b-41d4-a716-446655440008', 'Бутан', 'BUTANE', 'Газовое топливо', 0.5730, NULL);

-- ===============================================
-- EQUIPMENT TEMPLATES
-- ===============================================

INSERT INTO equipment_templates (id, name, system_type, technical_code, default_params) VALUES
-- Fuel Dispensers
('660e8400-e29b-41d4-a716-446655440001', 'Топливораздаточная колонка (ТРК)', 'fuel_dispenser', 'TRK-001', 
 '{"max_flow_rate": 40, "nozzle_count": 2, "supported_fuel_types": ["AI92", "AI95", "DT_SUMMER"], "display_type": "LCD"}'),

('660e8400-e29b-41d4-a716-446655440002', 'Многопродуктовая ТРК', 'multi_fuel_dispenser', 'TRK-MULTI', 
 '{"max_flow_rate": 50, "nozzle_count": 4, "supported_fuel_types": ["AI92", "AI95", "AI98", "DT_SUMMER"], "display_type": "Touch"}'),

-- Tank Equipment
('660e8400-e29b-41d4-a716-446655440003', 'Резервуар для топлива', 'fuel_tank', 'TANK-STD', 
 '{"capacity": 25000, "material": "steel", "coating": "epoxy", "monitoring_system": "automatic"}'),

('660e8400-e29b-41d4-a716-446655440004', 'Система измерения уровня', 'level_sensor', 'LEVEL-001', 
 '{"measurement_type": "hydrostatic", "accuracy": 0.1, "temperature_compensation": true}'),

-- Payment Systems
('660e8400-e29b-41d4-a716-446655440005', 'Платежный терминал', 'payment_terminal', 'PAY-001', 
 '{"supported_cards": ["VISA", "MasterCard", "МИР"], "contactless": true, "cash_support": false}'),

-- Monitoring Systems
('660e8400-e29b-41d4-a716-446655440006', 'Система видеонаблюдения', 'video_surveillance', 'CAM-001', 
 '{"camera_count": 8, "resolution": "4K", "night_vision": true, "storage_days": 30}'),

('660e8400-e29b-41d4-a716-446655440007', 'Система контроля доступа', 'access_control', 'ACCESS-001', 
 '{"card_readers": 4, "biometric": false, "remote_control": true}'),

-- Support Systems
('660e8400-e29b-41d4-a716-446655440008', 'Компрессор', 'air_compressor', 'COMP-001', 
 '{"max_pressure": 8, "power": "3kW", "auto_start": true}'),

('660e8400-e29b-41d4-a716-446655440009', 'Система освещения', 'lighting_system', 'LIGHT-001', 
 '{"led_count": 12, "auto_control": true, "motion_sensors": 6}'),

('660e8400-e29b-41d4-a716-446655440010', 'Генератор резервного питания', 'backup_generator', 'GEN-001', 
 '{"power": "50kW", "fuel_type": "diesel", "auto_start": true, "runtime": 24}');

-- ===============================================
-- SYSTEM ROLES
-- ===============================================

INSERT INTO roles (id, name, code, description, permissions, scope, tenant_id, is_system, is_active) VALUES
-- System Admin Role
('770e8400-e29b-41d4-a716-446655440001', 'Системный администратор', 'SYSTEM_ADMIN', 
 'Полный доступ ко всем функциям системы', 
 '[
   {"resource": "*", "action": "*", "scope": "global"},
   {"resource": "users", "action": "*", "scope": "global"},
   {"resource": "networks", "action": "*", "scope": "global"},
   {"resource": "system", "action": "*", "scope": "global"}
 ]', 
 'global', 'system', true, true),

-- Network Admin Role
('770e8400-e29b-41d4-a716-446655440002', 'Администратор сети', 'NETWORK_ADMIN', 
 'Администратор торговой сети с правами управления пользователями и точками', 
 '[
   {"resource": "trading_points", "action": "*", "scope": "network"},
   {"resource": "users", "action": "*", "scope": "network"},
   {"resource": "roles", "action": "*", "scope": "network"},
   {"resource": "equipment", "action": "*", "scope": "network"},
   {"resource": "operations", "action": "*", "scope": "network"},
   {"resource": "reports", "action": "*", "scope": "network"}
 ]', 
 'network', 'system', true, true),

-- Manager Role
('770e8400-e29b-41d4-a716-446655440003', 'Менеджер', 'MANAGER', 
 'Менеджер торговой точки с правами управления операциями', 
 '[
   {"resource": "operations", "action": "*", "scope": "trading_point"},
   {"resource": "equipment", "action": "read,update,control", "scope": "trading_point"},
   {"resource": "fuel_stocks", "action": "*", "scope": "trading_point"},
   {"resource": "reports", "action": "read,create,export", "scope": "trading_point"},
   {"resource": "users", "action": "read", "scope": "trading_point"}
 ]', 
 'trading_point', 'system', true, true),

-- Operator Role
('770e8400-e29b-41d4-a716-446655440004', 'Оператор', 'OPERATOR', 
 'Оператор торговой точки с базовыми правами', 
 '[
   {"resource": "operations", "action": "read,create", "scope": "trading_point"},
   {"resource": "equipment", "action": "read", "scope": "trading_point"},
   {"resource": "fuel_stocks", "action": "read", "scope": "trading_point"},
   {"resource": "reports", "action": "read", "scope": "trading_point"}
 ]', 
 'trading_point', 'system', true, true);

-- ===============================================
-- DEMO NETWORK AND DATA
-- ===============================================

-- Create demo network
INSERT INTO networks (id, name, code, description, status, settings) VALUES
('880e8400-e29b-41d4-a716-446655440001', 'Демо сеть АЗС', 'DEMO_NETWORK', 
 'Демонстрационная сеть автозаправочных станций для тестирования системы', 
 'active', 
 '{"currency": "RUB", "timezone": "Europe/Moscow", "working_hours": "24/7", "fuel_quality_standard": "GOST"}');

-- Create demo trading points
INSERT INTO trading_points (id, network_id, name, description, address, latitude, longitude, phone, email, schedule, services) VALUES
('990e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', 
 'АЗС №001 - Центральная', 'Центральная АЗС на Невском проспекте. Круглосуточно, полный сервис.',
 'Невский проспект, 100, Санкт-Петербург, Россия', 59.9311, 30.3609, '+7 (812) 123-45-67', 'central@demo-azs.ru',
 '{"monday": "00:00-23:59", "tuesday": "00:00-23:59", "wednesday": "00:00-23:59", "thursday": "00:00-23:59", "friday": "00:00-23:59", "saturday": "00:00-23:59", "sunday": "00:00-23:59", "is_always_open": true}',
 '{"self_service_terminal": true, "air_pump": true, "car_wash": true, "shop": true, "cafe": false, "lubricants": false, "water_service": false, "gas_bottle_exchange": false, "electric_charging": false, "truck_parking": false}'),

('990e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440001', 
 'АЗС №002 - Северная', 'Северная АЗС для коммерческого транспорта.',
 'пр. Энгельса, 154, Санкт-Петербург, Россия', 60.0348, 30.3158, '+7 (812) 234-56-78', 'north@demo-azs.ru',
 '{"monday": "06:00-23:00", "tuesday": "06:00-23:00", "wednesday": "06:00-23:00", "thursday": "06:00-23:00", "friday": "06:00-23:00", "saturday": "06:00-23:00", "sunday": "06:00-23:00", "is_always_open": false}',
 '{"self_service_terminal": false, "air_pump": true, "car_wash": false, "shop": false, "cafe": false, "lubricants": true, "water_service": false, "gas_bottle_exchange": false, "electric_charging": false, "truck_parking": true}');

-- Create demo system admin user
-- Password: admin123 (will be hashed in real implementation)
INSERT INTO users (id, email, password_hash, name, role, network_id, is_active) VALUES
('aa0e8400-e29b-41d4-a716-446655440001', 'admin@tradeframe.com', 
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeShMKjGEeILVSHFK', -- admin123
 'Системный администратор', 'system_admin', null, true);

-- Create demo network admin user
INSERT INTO users (id, email, password_hash, name, role, network_id, is_active) VALUES
('aa0e8400-e29b-41d4-a716-446655440002', 'network.admin@demo-azs.ru', 
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeShMKjGEeILVSHFK', -- admin123
 'Администратор демо сети', 'network_admin', '880e8400-e29b-41d4-a716-446655440001', true);

-- Create demo manager user
INSERT INTO users (id, email, password_hash, name, role, network_id, trading_point_ids, is_active) VALUES
('aa0e8400-e29b-41d4-a716-446655440003', 'manager@demo-azs.ru', 
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeShMKjGEeILVSHFK', -- admin123
 'Менеджер центральной АЗС', 'manager', '880e8400-e29b-41d4-a716-446655440001', 
 '["990e8400-e29b-41d4-a716-446655440001"]', true);

-- Create demo operator user
INSERT INTO users (id, email, password_hash, name, role, network_id, trading_point_ids, is_active) VALUES
('aa0e8400-e29b-41d4-a716-446655440004', 'operator@demo-azs.ru', 
 '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeShMKjGEeILVSHFK', -- admin123
 'Оператор центральной АЗС', 'operator', '880e8400-e29b-41d4-a716-446655440001', 
 '["990e8400-e29b-41d4-a716-446655440001"]', true);

-- Assign system roles to users
INSERT INTO user_roles (user_id, role_id, assigned_by, assigned_at) VALUES
('aa0e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'aa0e8400-e29b-41d4-a716-446655440001', NOW()),
('aa0e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', 'aa0e8400-e29b-41d4-a716-446655440001', NOW()),
('aa0e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440003', 'aa0e8400-e29b-41d4-a716-446655440002', NOW()),
('aa0e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440004', 'aa0e8400-e29b-41d4-a716-446655440002', NOW());

-- Create demo tanks for Central trading point
INSERT INTO tanks (id, trading_point_id, name, fuel_type_id, capacity, current_volume, min_volume, max_volume, status, last_calibration, metadata) VALUES
('bb0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440001', 
 'Резервуар №1 (АИ-92)', '550e8400-e29b-41d4-a716-446655440001', 25000, 18500, 2500, 24000, 'active', NOW() - INTERVAL '15 days',
 '{"temperature": 18.5, "water_level": 2, "last_cleaning": "2024-01-15"}'),

('bb0e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440001', 
 'Резервуар №2 (АИ-95)', '550e8400-e29b-41d4-a716-446655440002', 25000, 21300, 2500, 24000, 'active', NOW() - INTERVAL '10 days',
 '{"temperature": 19.2, "water_level": 1, "last_cleaning": "2024-01-20"}'),

('bb0e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440001', 
 'Резервуар №3 (ДТ)', '550e8400-e29b-41d4-a716-446655440004', 30000, 15800, 3000, 28500, 'active', NOW() - INTERVAL '7 days',
 '{"temperature": 17.8, "water_level": 3, "last_cleaning": "2024-01-25"}');

-- Create fuel stocks for demo trading point
INSERT INTO fuel_stocks (trading_point_id, fuel_type_id, tank_id, current_volume, reserved_volume, alerts, metadata) VALUES
('990e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'bb0e8400-e29b-41d4-a716-446655440001', 
 18500, 500, '[]', '{"last_delivery": "2024-01-20", "delivery_volume": 10000}'),

('990e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'bb0e8400-e29b-41d4-a716-446655440002', 
 21300, 300, '[]', '{"last_delivery": "2024-01-22", "delivery_volume": 12000}'),

('990e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', 'bb0e8400-e29b-41d4-a716-446655440003', 
 15800, 200, '["Требуется заправка в течение недели"]', '{"last_delivery": "2024-01-18", "delivery_volume": 8000}');

-- Create demo equipment for Central trading point
INSERT INTO equipment (id, trading_point_id, template_id, name, system_type, display_name, serial_number, status, installation_date, params) VALUES
('cc0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001',
 'Топливораздаточная колонка (ТРК)', 'fuel_dispenser', 'ТРК-001', 'TRK2024-001', 'online', '2024-01-01',
 '{"max_flow_rate": 40, "nozzle_count": 2, "supported_fuel_types": ["AI92", "AI95"], "display_type": "LCD"}'),

('cc0e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002',
 'Многопродуктовая ТРК', 'multi_fuel_dispenser', 'ТРК-002', 'TRK2024-002', 'online', '2024-01-01',
 '{"max_flow_rate": 50, "nozzle_count": 4, "supported_fuel_types": ["AI92", "AI95", "AI98", "DT_SUMMER"], "display_type": "Touch"}'),

('cc0e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440005',
 'Платежный терминал', 'payment_terminal', 'Terminal-001', 'PAY2024-001', 'online', '2024-01-01',
 '{"supported_cards": ["VISA", "MasterCard", "МИР"], "contactless": true, "cash_support": false}');

-- Create demo price history
INSERT INTO price_history (trading_point_id, fuel_type_id, price, effective_date, reason, set_by) VALUES
('990e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 52.50, NOW() - INTERVAL '30 days', 'Начальная цена', 'aa0e8400-e29b-41d4-a716-446655440003'),
('990e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 55.80, NOW() - INTERVAL '30 days', 'Начальная цена', 'aa0e8400-e29b-41d4-a716-446655440003'),
('990e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', 58.20, NOW() - INTERVAL '30 days', 'Начальная цена', 'aa0e8400-e29b-41d4-a716-446655440003'),

-- Recent price changes
('990e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 53.20, NOW() - INTERVAL '7 days', 'Корректировка рынка', 'aa0e8400-e29b-41d4-a716-446655440003'),
('990e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 56.40, NOW() - INTERVAL '7 days', 'Корректировка рынка', 'aa0e8400-e29b-41d4-a716-446655440003');

-- ===============================================
-- LOG COMPLETION
-- ===============================================

DO $$
BEGIN
    RAISE NOTICE 'Seed data has been successfully inserted';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '- 8 fuel types (АИ-92, АИ-95, АИ-98, ДТ types, Propane, Butane)';
    RAISE NOTICE '- 10 equipment templates';
    RAISE NOTICE '- 4 system roles (system_admin, network_admin, manager, operator)';
    RAISE NOTICE '- 1 demo network with 2 trading points';
    RAISE NOTICE '- 4 demo users (admin, network_admin, manager, operator)';
    RAISE NOTICE '- 3 fuel tanks with stocks';
    RAISE NOTICE '- 3 pieces of equipment';
    RAISE NOTICE '- Price history data';
    RAISE NOTICE '';
    RAISE NOTICE 'Demo login credentials:';
    RAISE NOTICE 'System Admin: admin@tradeframe.com / admin123';
    RAISE NOTICE 'Network Admin: network.admin@demo-azs.ru / admin123';
    RAISE NOTICE 'Manager: manager@demo-azs.ru / admin123';
    RAISE NOTICE 'Operator: operator@demo-azs.ru / admin123';
END
$$;